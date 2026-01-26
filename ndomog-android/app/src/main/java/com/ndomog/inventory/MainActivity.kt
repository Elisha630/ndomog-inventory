package com.ndomog.inventory

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.ndomog.inventory.presentation.AppNavigation
import com.ndomog.inventory.presentation.auth.PinLockScreen
import com.ndomog.inventory.presentation.theme.NdomogTheme
import com.ndomog.inventory.utils.PinPreferences
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

class MainActivity : ComponentActivity() {
    private val requestNotificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        // Permission handling is done implicitly
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Request notification permission for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != android.content.pm.PackageManager.PERMISSION_GRANTED
            ) {
                requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        
        val app = application as NdomogApplication
        
        setContent {
            NdomogTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    MainAppContent(app, this@MainActivity)
                }
            }
        }
    }
}

@Composable
fun MainAppContent(app: NdomogApplication, activity: MainActivity) {
    val context = LocalContext.current
    val pinPreferences = remember { PinPreferences(context) }
    
    // Track if PIN is enabled and if the app is locked
    var isPinEnabled by remember { mutableStateOf(false) }
    var isLocked by remember { mutableStateOf(false) }
    var hasCheckedPin by remember { mutableStateOf(false) }
    
    // Check PIN enabled status on launch
    LaunchedEffect(Unit) {
        isPinEnabled = pinPreferences.isPinEnabled.first()
        isLocked = isPinEnabled // Lock on first launch if PIN is enabled
        hasCheckedPin = true
    }
    
    // Listen for app lifecycle to lock when returning from background
    DisposableEffect(activity) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> {
                    // App is going to background - mark for lock on resume
                    runBlocking {
                        isPinEnabled = pinPreferences.isPinEnabled.first()
                        if (isPinEnabled) {
                            isLocked = true
                        }
                    }
                }
                else -> {}
            }
        }
        activity.lifecycle.addObserver(observer)
        onDispose {
            activity.lifecycle.removeObserver(observer)
        }
    }
    
    // Show PIN lock screen if locked
    if (!hasCheckedPin) {
        // Still loading PIN state, show nothing
        Surface(modifier = Modifier.fillMaxSize()) {}
    } else if (isLocked && isPinEnabled) {
        PinLockScreen(
            pinPreferences = pinPreferences,
            onUnlock = {
                isLocked = false
            }
        )
    } else {
        AppNavigation(authRepository = app.authRepository, database = app.database)
    }
}

@Preview(showBackground = true)
@Composable
fun DefaultPreview() {
    NdomogTheme {
        // AppNavigation(authRepository = AuthRepository()) // Provide a mock for preview if needed
        // Just show a simple text for preview
        androidx.compose.material3.Text("Ndomog Inventory Preview")
    }
}
