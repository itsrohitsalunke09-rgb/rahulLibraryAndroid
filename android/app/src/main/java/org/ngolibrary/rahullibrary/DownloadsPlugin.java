package org.ngolibrary.rahullibrary;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Saves a file the app made into the phone's Download › Rahul Library folder and shows a
 * "Download complete" notification that opens it. Android's own MediaStore puts it there on
 * Android 10+, with no storage permission; older phones write the file directly.
 */
@CapacitorPlugin(
    name = "Downloads",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }),
        @Permission(alias = "storage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
    }
)
public class DownloadsPlugin extends Plugin {

    static final String FOLDER = "Rahul Library";
    private static final String CHANNEL = "downloads";

    @PluginMethod
    public void save(PluginCall call) {
        // Android 9 and older still need storage permission to write into Download.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "afterStoragePermission");
            return;
        }
        String fileName = call.getString("fileName");
        String data = call.getString("data");
        String mimeType = call.getString("mimeType", "application/pdf");
        if (fileName == null || data == null) {
            call.reject("fileName and data are required");
            return;
        }
        Uri uri;
        String savedName;
        try {
            byte[] bytes = Base64.decode(data, Base64.DEFAULT);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                values.put(MediaStore.Downloads.MIME_TYPE, mimeType);
                values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + FOLDER);
                values.put(MediaStore.Downloads.IS_PENDING, 1);
                uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) {
                    throw new IllegalStateException("Android could not create the file");
                }
                try (OutputStream out = resolver.openOutputStream(uri)) {
                    out.write(bytes);
                }
                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(uri, values, null, null);
                // Android may have renamed it, e.g. "name (1).pdf" when one already exists.
                savedName = displayName(resolver, uri, fileName);
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), FOLDER);
                if (!dir.exists() && !dir.mkdirs()) {
                    throw new IllegalStateException("Could not create the Download folder");
                }
                File file = uniqueFile(dir, fileName);
                try (OutputStream out = new FileOutputStream(file)) {
                    out.write(bytes);
                }
                MediaScannerConnection.scanFile(getContext(), new String[] { file.getAbsolutePath() }, new String[] { mimeType }, null);
                uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                savedName = file.getName();
            }
        } catch (Exception e) {
            call.reject("Could not save the file: " + e.getMessage(), e);
            return;
        }

        JSObject result = new JSObject();
        result.put("path", Environment.DIRECTORY_DOWNLOADS + " › " + FOLDER + " › " + savedName);
        result.put("uri", uri.toString());
        call.getData().put("savedName", savedName);
        call.getData().put("savedUri", uri.toString());
        call.getData().put("mimeType", mimeType);
        call.getData().put("result", result);
        // Android 13+ asks once before an app may show notifications.
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "afterNotificationPermission");
        } else {
            finish(call);
        }
    }

    @PermissionCallback
    private void afterStoragePermission(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            save(call);
        } else {
            call.reject("Allow storage access to save the PDF.");
        }
    }

    @PermissionCallback
    private void afterNotificationPermission(PluginCall call) {
        finish(call);
    }

    /** Shows the notification (if allowed) and returns where the file went. */
    private void finish(PluginCall call) {
        JSObject result = call.getObject("result", new JSObject());
        boolean notified = notify(call.getString("savedName"), Uri.parse(call.getString("savedUri")), call.getString("mimeType"));
        result.put("notified", notified);
        call.resolve(result);
    }

    private boolean notify(String fileName, Uri uri, String mimeType) {
        Context context = getContext();
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) {
            return false;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Downloads", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("PDFs saved by the app");
            context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
        Intent open = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, mimeType)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent tap = PendingIntent.getActivity(context, fileName.hashCode(), open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle("Download complete")
            .setContentText(fileName)
            .setContentIntent(tap)
            .setAutoCancel(true);
        try {
            manager.notify(fileName.hashCode(), notification.build());
            return true;
        } catch (SecurityException e) {
            return false;
        }
    }

    private static String displayName(ContentResolver resolver, Uri uri, String fallback) {
        try (android.database.Cursor c = resolver.query(uri, new String[] { MediaStore.Downloads.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                return c.getString(0);
            }
        } catch (Exception ignored) {
            // The file is saved either way; only the name in the message may be off.
        }
        return fallback;
    }

    /** "name.pdf", or "name (1).pdf" etc. when it already exists (older Android only). */
    private static File uniqueFile(File dir, String fileName) {
        File file = new File(dir, fileName);
        int dot = fileName.lastIndexOf('.');
        String base = dot > 0 ? fileName.substring(0, dot) : fileName;
        String ext = dot > 0 ? fileName.substring(dot) : "";
        for (int i = 1; file.exists(); i++) {
            file = new File(dir, base + " (" + i + ")" + ext);
        }
        return file;
    }
}
