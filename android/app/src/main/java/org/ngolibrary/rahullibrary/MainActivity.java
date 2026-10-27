package org.ngolibrary.rahullibrary;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own plugin: saves exported PDFs to Download and notifies.
        registerPlugin(DownloadsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
