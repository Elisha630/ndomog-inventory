package com.ndomog.inventory.presentation.auth

import android.os.Build
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.ndomog.inventory.presentation.theme.NdomogColors
import com.ndomog.inventory.utils.PinPreferences
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@Composable
fun PinLockScreen(
    pinPreferences: PinPreferences,
    onUnlock: () -> Unit,
    onBiometricUnlock: () -> Unit = {}
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    
    var enteredPin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var storedPinHash by remember { mutableStateOf("") }
    var isBiometricEnabled by remember { mutableStateOf(false) }
    var biometricAvailable by remember { mutableStateOf(false) }
    
    // Load stored PIN hash and biometric settings
    LaunchedEffect(Unit) {
        storedPinHash = pinPreferences.pinHash.first() ?: ""
        isBiometricEnabled = pinPreferences.isBiometricEnabled.first()
        
        // Check if biometric hardware is available
        val biometricManager = BiometricManager.from(context)
        biometricAvailable = when (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)) {
            BiometricManager.BIOMETRIC_SUCCESS -> true
            else -> false
        }
        
        // Auto-trigger biometric if enabled and available
        if (isBiometricEnabled && biometricAvailable) {
            showBiometricPrompt(context as? FragmentActivity, onUnlock)
        }
    }
    
    // Check PIN when 4 digits entered
    LaunchedEffect(enteredPin) {
        if (enteredPin.length == 4) {
            if (enteredPin == storedPinHash) {
                onUnlock()
            } else {
                error = "Incorrect PIN"
                enteredPin = ""
            }
        }
    }
    
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = NdomogColors.DarkBackground
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Logo
            Surface(
                modifier = Modifier.size(72.dp),
                shape = RoundedCornerShape(16.dp),
                color = NdomogColors.Primary
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.fillMaxSize()
                ) {
                    Icon(
                        Icons.Filled.Settings,
                        contentDescription = "Ndomog Logo",
                        tint = NdomogColors.TextOnPrimary,
                        modifier = Modifier.size(40.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            Text(
                "Enter PIN",
                style = MaterialTheme.typography.headlineMedium.copy(
                    color = NdomogColors.TextLight,
                    fontWeight = FontWeight.Bold
                )
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                "Enter your 4-digit PIN to unlock",
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = NdomogColors.TextMuted
                )
            )
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // PIN Dots
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                repeat(4) { index ->
                    Box(
                        modifier = Modifier
                            .size(20.dp)
                            .clip(CircleShape)
                            .background(
                                if (index < enteredPin.length) NdomogColors.Primary 
                                else Color.Transparent
                            )
                            .border(2.dp, NdomogColors.Primary, CircleShape)
                    )
                }
            }
            
            // Error message
            if (error != null) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    error!!,
                    color = NdomogColors.Error,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Number Pad
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Row 1: 1, 2, 3
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    PinButton("1") { if (enteredPin.length < 4) { enteredPin += "1"; error = null } }
                    PinButton("2") { if (enteredPin.length < 4) { enteredPin += "2"; error = null } }
                    PinButton("3") { if (enteredPin.length < 4) { enteredPin += "3"; error = null } }
                }
                // Row 2: 4, 5, 6
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    PinButton("4") { if (enteredPin.length < 4) { enteredPin += "4"; error = null } }
                    PinButton("5") { if (enteredPin.length < 4) { enteredPin += "5"; error = null } }
                    PinButton("6") { if (enteredPin.length < 4) { enteredPin += "6"; error = null } }
                }
                // Row 3: 7, 8, 9
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    PinButton("7") { if (enteredPin.length < 4) { enteredPin += "7"; error = null } }
                    PinButton("8") { if (enteredPin.length < 4) { enteredPin += "8"; error = null } }
                    PinButton("9") { if (enteredPin.length < 4) { enteredPin += "9"; error = null } }
                }
                // Row 4: Biometric, 0, Backspace
                Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                    // Biometric button (if available)
                    if (isBiometricEnabled && biometricAvailable) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .clip(CircleShape)
                                .clickable {
                                    showBiometricPrompt(context as? FragmentActivity, onUnlock)
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Filled.Fingerprint,
                                contentDescription = "Use Fingerprint",
                                tint = NdomogColors.Primary,
                                modifier = Modifier.size(32.dp)
                            )
                        }
                    } else {
                        Spacer(modifier = Modifier.size(72.dp))
                    }
                    
                    PinButton("0") { if (enteredPin.length < 4) { enteredPin += "0"; error = null } }
                    
                    // Backspace
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .clickable {
                                if (enteredPin.isNotEmpty()) {
                                    enteredPin = enteredPin.dropLast(1)
                                    error = null
                                }
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Filled.Backspace,
                            contentDescription = "Delete",
                            tint = NdomogColors.TextMuted,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PinButton(
    text: String,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(72.dp)
            .clip(CircleShape)
            .background(NdomogColors.DarkCard)
            .border(1.dp, NdomogColors.DarkBorder, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text,
            style = MaterialTheme.typography.headlineMedium.copy(
                color = NdomogColors.TextLight,
                fontWeight = FontWeight.Bold,
                fontSize = 28.sp
            )
        )
    }
}

private fun showBiometricPrompt(activity: FragmentActivity?, onSuccess: () -> Unit) {
    activity ?: return
    
    val executor = ContextCompat.getMainExecutor(activity)
    val biometricPrompt = BiometricPrompt(activity, executor,
        object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                super.onAuthenticationSucceeded(result)
                onSuccess()
            }
        }
    )
    
    val promptInfo = BiometricPrompt.PromptInfo.Builder()
        .setTitle("Unlock Ndomog Investment")
        .setSubtitle("Use your fingerprint or face to unlock")
        .setNegativeButtonText("Use PIN")
        .build()
    
    biometricPrompt.authenticate(promptInfo)
}
