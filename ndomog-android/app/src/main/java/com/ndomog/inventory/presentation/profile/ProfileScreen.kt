package com.ndomog.inventory.presentation.profile

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Environment
import android.annotation.SuppressLint
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.ndomog.inventory.di.ViewModelFactory
import com.ndomog.inventory.presentation.theme.NdomogColors
import com.ndomog.inventory.utils.ThemePreferences
import com.ndomog.inventory.utils.PinPreferences
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.launch

// App version info
private const val APP_VERSION = "1.2.3"
private const val BUILD_NUMBER = "42"

@SuppressLint("UnusedMaterial3ScaffoldPaddingParameter")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onBack: () -> Unit,
    viewModelFactory: ViewModelFactory,
    onLogout: () -> Unit = {}
) {
    val viewModel: ProfileViewModel = viewModel(factory = viewModelFactory)
    val context = LocalContext.current
    val uriHandler = LocalUriHandler.current
    val themePreferences = remember { ThemePreferences(context) }
    val pinPreferences = remember { PinPreferences(context) }
    val scope = rememberCoroutineScope()
    
    val userEmail by viewModel.userEmail.collectAsState()
    val username by viewModel.username.collectAsState()
    val avatarUrl by viewModel.avatarUrl.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val successMessage by viewModel.successMessage.collectAsState()
    val isAdmin by viewModel.isAdmin.collectAsState()
    val isLoggedOut by viewModel.isLoggedOut.collectAsState()
    val updateAvailable by viewModel.updateAvailable.collectAsState()
    val latestRelease by viewModel.latestRelease.collectAsState()

    var isEditingUsername by remember { mutableStateOf(false) }
    var newUsername by remember { mutableStateOf("") }
    
    // Dialogs
    var showChangePasswordDialog by remember { mutableStateOf(false) }
    var showPinSetupDialog by remember { mutableStateOf(false) }
    var showVersionInfoDialog by remember { mutableStateOf(false) }
    var showAboutDialog by remember { mutableStateOf(false) }
    var showAvatarOptions by remember { mutableStateOf(false) }
    
    // PIN Lock state - load from DataStore
    val isPinEnabledState by pinPreferences.isPinEnabled.collectAsState(false)
    val isBiometricEnabledState by pinPreferences.isBiometricEnabled.collectAsState(false)
    
    var isPinEnabled by remember { mutableStateOf(false) }
    var isBiometricEnabled by remember { mutableStateOf(false) }
    var biometricAvailable by remember { mutableStateOf(false) }
    
    // Load PIN state on composition
    LaunchedEffect(isPinEnabledState, isBiometricEnabledState) {
        isPinEnabled = isPinEnabledState
        isBiometricEnabled = isBiometricEnabledState
    }
    
    // Check if biometric hardware is available
    LaunchedEffect(Unit) {
        val biometricManager = BiometricManager.from(context)
        biometricAvailable = when (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)) {
            BiometricManager.BIOMETRIC_SUCCESS -> true
            else -> false
        }
    }
    
    // Watch for logout and navigate
    LaunchedEffect(isLoggedOut) {
        if (isLoggedOut) {
            onLogout()
        }
    }
    
    // Accessibility states - these now persist and apply via ThemePreferences
    val isDarkMode by themePreferences.isDarkMode.collectAsState(true)
    val isHighContrast by themePreferences.isHighContrast.collectAsState(false)
    val textSizeValue by themePreferences.textSize.collectAsState(1f)
    
    // Avatar upload
    var tempPhotoUri by remember { mutableStateOf<Uri?>(null) }
    
    fun createImageFile(): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile("AVATAR_${timeStamp}_", ".jpg", storageDir)
    }
    
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            viewModel.updateAvatar(it.toString())
        }
    }
    
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && tempPhotoUri != null) {
            viewModel.updateAvatar(tempPhotoUri.toString())
        }
    }
    
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            try {
                val photoFile = createImageFile()
                tempPhotoUri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    photoFile
                )
                tempPhotoUri?.let { cameraLauncher.launch(it) }
            } catch (_: Exception) {}
        }
    }
    
    fun launchCamera() {
        try {
            val permission = Manifest.permission.CAMERA
            when {
                ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED -> {
                    val photoFile = createImageFile()
                    tempPhotoUri = FileProvider.getUriForFile(
                        context,
                        "${context.packageName}.fileprovider",
                        photoFile
                    )
                    tempPhotoUri?.let { cameraLauncher.launch(it) }
                }
                else -> {
                    cameraPermissionLauncher.launch(permission)
                }
            }
        } catch (_: Exception) {}
    }
    
    // Function to show biometric prompt
    fun showBiometricPromptForEnabling() {
        val activity = context as? FragmentActivity ?: return
        val executor = ContextCompat.getMainExecutor(context)
        val biometricPrompt = BiometricPrompt(activity, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    isBiometricEnabled = true
                    scope.launch {
                        pinPreferences.setBiometricEnabled(true)
                    }
                }
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    // Don't enable biometric
                }
                override fun onAuthenticationFailed() {
                    // Don't enable biometric
                }
            }
        )
        
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Enable Biometric Unlock")
            .setSubtitle("Confirm your identity to enable biometric unlock")
            .setNegativeButtonText("Cancel")
            .build()
        
        biometricPrompt.authenticate(promptInfo)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Profile Settings",
                        color = NdomogColors.TextLight,
                        style = MaterialTheme.typography.headlineSmall
                    ) 
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = NdomogColors.Primary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = NdomogColors.DarkCard,
                    scrolledContainerColor = NdomogColors.DarkCard
                )
            )
        },
        containerColor = NdomogColors.DarkBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(NdomogColors.DarkBackground)
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    color = NdomogColors.Primary,
                    modifier = Modifier.padding(32.dp)
                )
            } else if (error != null) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = NdomogColors.ErrorBackground),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        "Error: $error",
                        color = NdomogColors.ErrorText,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            
            // Success message
            if (successMessage != null) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = NdomogColors.Success.copy(alpha = 0.2f)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        successMessage!!,
                        color = NdomogColors.Success,
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                LaunchedEffect(successMessage) {
                    kotlinx.coroutines.delay(3000)
                    viewModel.clearMessages()
                }
            }
            
            // Avatar Section with upload
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .padding(bottom = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(96.dp)
                        .border(
                            width = 3.dp,
                            color = NdomogColors.Primary,
                            shape = CircleShape
                        )
                        .clip(CircleShape)
                        .background(NdomogColors.DarkSecondary)
                        .clickable { showAvatarOptions = true },
                    contentAlignment = Alignment.Center
                ) {
                    if (avatarUrl != null && avatarUrl!!.isNotEmpty()) {
                        AsyncImage(
                            model = avatarUrl,
                            contentDescription = "Avatar",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                    } else {
                        Icon(
                            Icons.Filled.Person,
                            contentDescription = "No avatar",
                            tint = NdomogColors.Primary,
                            modifier = Modifier.size(48.dp)
                        )
                    }
                }
                // Edit badge
                Surface(
                    modifier = Modifier
                        .size(28.dp)
                        .align(Alignment.BottomEnd),
                    shape = CircleShape,
                    color = NdomogColors.Primary
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier
                            .fillMaxSize()
                            .clickable { showAvatarOptions = true }
                    ) {
                        Icon(
                            Icons.Filled.Edit,
                            contentDescription = "Edit Avatar",
                            tint = NdomogColors.TextOnPrimary,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Username section
            if (isEditingUsername) {
                OutlinedTextField(
                    value = newUsername,
                    onValueChange = { newUsername = it },
                    modifier = Modifier.fillMaxWidth(0.7f),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = NdomogColors.DarkBorder,
                        focusedBorderColor = NdomogColors.Primary,
                        unfocusedContainerColor = NdomogColors.DarkSecondary.copy(alpha = 0.5f),
                        focusedContainerColor = NdomogColors.DarkSecondary.copy(alpha = 0.5f),
                        unfocusedTextColor = Color.White,
                        focusedTextColor = Color.White
                    ),
                    shape = RoundedCornerShape(8.dp),
                    singleLine = true
                )
                Row(
                    modifier = Modifier
                        .fillMaxWidth(0.7f)
                        .padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            viewModel.updateUsername(newUsername)
                            isEditingUsername = false
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(40.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = NdomogColors.Primary),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Save", color = NdomogColors.TextOnPrimary, fontWeight = FontWeight.Bold)
                    }
                    OutlinedButton(
                        onClick = { isEditingUsername = false },
                        modifier = Modifier
                            .weight(1f)
                            .height(40.dp),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Cancel")
                    }
                }
            } else {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "@${username ?: "Set username"}",
                        style = MaterialTheme.typography.titleLarge.copy(
                            color = NdomogColors.TextLight,
                            fontWeight = FontWeight.Bold
                        )
                    )
                    IconButton(
                        onClick = {
                            newUsername = username ?: ""
                            isEditingUsername = true
                        },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Filled.Edit,
                            contentDescription = "Edit Username",
                            tint = NdomogColors.TextMuted,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }

            // Email display (non-editable)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 4.dp)
            ) {
                Icon(
                    Icons.Filled.Email,
                    contentDescription = null,
                    tint = NdomogColors.TextMuted,
                    modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    userEmail ?: "N/A",
                    style = MaterialTheme.typography.bodySmall.copy(color = NdomogColors.TextMuted)
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))

            // Admin Tools Section (only visible for admins) - Merged with Manage Users
            if (isAdmin) {
                SettingSection(
                    title = "Admin Tools",
                    subtitle = "Manage app settings, releases and users",
                    icon = Icons.Filled.AdminPanelSettings,
                    items = listOf(
                        SettingItem(
                            label = "Manage App Releases",
                            icon = Icons.Filled.Download,
                            action = { /* TODO: Navigate to releases */ }
                        ),
                        SettingItem(
                            label = "Manage Users",
                            icon = Icons.Filled.People,
                            action = { /* TODO: Navigate to users */ }
                        )
                    )
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Account Security Section
            SettingSection(
                title = "Account Security",
                icon = Icons.Filled.Lock,
                items = listOf(
                    SettingItem(
                        label = "Change Password",
                        icon = Icons.Filled.VpnKey,
                        action = { showChangePasswordDialog = true }
                    )
                )
            )

            Spacer(modifier = Modifier.height(12.dp))

            // PIN Lock Section with toggle
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = NdomogColors.DarkCard.copy(alpha = 0.6f)),
                border = BorderStroke(1.dp, NdomogColors.Primary.copy(alpha = 0.2f)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Pin,
                            contentDescription = "PIN Lock",
                            tint = NdomogColors.Primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "PIN Lock",
                            style = MaterialTheme.typography.titleSmall.copy(
                                color = NdomogColors.TextLight,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                    
                    Divider(color = NdomogColors.DarkBorder.copy(alpha = 0.3f))
                    
                    // Enable PIN Lock toggle
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                "Enable PIN Lock",
                                style = MaterialTheme.typography.bodyMedium.copy(color = NdomogColors.TextLight)
                            )
                            Text(
                                "Require a PIN to access the app",
                                style = MaterialTheme.typography.bodySmall.copy(color = NdomogColors.TextMuted)
                            )
                        }
                        Switch(
                            checked = isPinEnabled,
                            onCheckedChange = { newValue ->
                                if (newValue) {
                                    showPinSetupDialog = true
                                } else {
                                    isPinEnabled = false
                                    isBiometricEnabled = false
                                    // Clear PIN from DataStore
                                    scope.launch {
                                        pinPreferences.setPinEnabled(false)
                                        pinPreferences.setBiometricEnabled(false)
                                    }
                                }
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = NdomogColors.Primary,
                                checkedTrackColor = NdomogColors.Primary.copy(alpha = 0.5f)
                            )
                        )
                    }
                    
                    // Biometric toggle (only if PIN is enabled and biometric is available)
                    if (isPinEnabled && biometricAvailable) {
                        Divider(color = NdomogColors.DarkBorder.copy(alpha = 0.3f))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    "Use Biometrics",
                                    style = MaterialTheme.typography.bodyMedium.copy(color = NdomogColors.TextLight)
                                )
                                Text(
                                    "Unlock with fingerprint or face",
                                    style = MaterialTheme.typography.bodySmall.copy(color = NdomogColors.TextMuted)
                                )
                            }
                            Switch(
                                checked = isBiometricEnabled,
                                onCheckedChange = { newValue ->
                                    if (newValue) {
                                        // Require biometric authentication to enable
                                        showBiometricPromptForEnabling()
                                    } else {
                                        isBiometricEnabled = false
                                        scope.launch {
                                            pinPreferences.setBiometricEnabled(false)
                                        }
                                    }
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = NdomogColors.Primary,
                                    checkedTrackColor = NdomogColors.Primary.copy(alpha = 0.5f)
                                )
                            )
                        }
                    } else if (isPinEnabled && !biometricAvailable) {
                        Divider(color = NdomogColors.DarkBorder.copy(alpha = 0.3f))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Filled.Info,
                                contentDescription = null,
                                tint = NdomogColors.TextMuted,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "Biometric unlock not available on this device",
                                style = MaterialTheme.typography.bodySmall.copy(color = NdomogColors.TextMuted)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // App Management Section (merged with About)
            SettingSection(
                title = "App Management",
                icon = Icons.Filled.Settings,
                items = listOf(
                    SettingItem(
                        label = "Check for Updates",
                        icon = Icons.Filled.Refresh,
                        action = { 
                            viewModel.checkForUpdates()
                            showVersionInfoDialog = true
                        }
                    ),
                    SettingItem(
                        label = "About This App",
                        icon = Icons.Filled.HelpOutline,
                        action = { showAboutDialog = true }
                    )
                )
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Sign Out Button
            Button(
                onClick = { viewModel.logout() },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = NdomogColors.Error
                ),
                shape = RoundedCornerShape(8.dp)
            ) {
                Icon(
                    Icons.Filled.ExitToApp,
                    contentDescription = "Sign Out",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Sign Out",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // App Version at the very bottom
            Text(
                "Version $APP_VERSION (Build $BUILD_NUMBER)",
                style = MaterialTheme.typography.bodySmall.copy(color = NdomogColors.TextMuted),
                modifier = Modifier.fillMaxWidth(),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
            
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
    
    // Avatar Options Bottom Sheet
    if (showAvatarOptions) {
        AlertDialog(
            onDismissRequest = { showAvatarOptions = false },
            containerColor = NdomogColors.DarkCard,
            title = {
                Text("Change Profile Photo", color = NdomogColors.TextLight)
            },
            text = {
                Column {
                    TextButton(
                        onClick = {
                            showAvatarOptions = false
                            imagePickerLauncher.launch("image/*")
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Filled.Photo, contentDescription = null, tint = NdomogColors.Primary)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Choose from Gallery", color = NdomogColors.TextLight)
                    }
                    TextButton(
                        onClick = {
                            showAvatarOptions = false
                            launchCamera()
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Filled.CameraAlt, contentDescription = null, tint = NdomogColors.Primary)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Take a Photo", color = NdomogColors.TextLight)
                    }
                    if (avatarUrl != null) {
                        TextButton(
                            onClick = {
                                showAvatarOptions = false
                                viewModel.updateAvatar("")
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Filled.Delete, contentDescription = null, tint = NdomogColors.Error)
                            Spacer(modifier = Modifier.width(12.dp))
                            Text("Remove Photo", color = NdomogColors.Error)
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showAvatarOptions = false }) {
                    Text("Cancel", color = NdomogColors.TextMuted)
                }
            }
        )
    }
    
    // Change Password Dialog
    if (showChangePasswordDialog) {
        ChangePasswordDialog(
            onDismiss = { showChangePasswordDialog = false },
            onConfirm = { oldPassword, newPassword ->
                viewModel.updatePassword(oldPassword, newPassword)
                showChangePasswordDialog = false
            }
        )
    }
    
    // PIN Setup Dialog
    if (showPinSetupDialog) {
        PinSetupDialog(
            onDismiss = { showPinSetupDialog = false },
            onConfirm = { pin ->
                isPinEnabled = true
                showPinSetupDialog = false
                // Save PIN securely to DataStore
                scope.launch {
                    pinPreferences.setPinEnabled(true)
                    // In a real app, hash the PIN before storing
                    pinPreferences.setPinHash(pin) // TODO: Use proper hashing
                }
            }
        )
    }
    
    // Version Info Dialog
    if (showVersionInfoDialog) {
        VersionInfoDialog(
            currentVersion = APP_VERSION,
            buildNumber = BUILD_NUMBER,
            updateAvailable = updateAvailable,
            latestVersion = latestRelease?.version,
            onDismiss = { showVersionInfoDialog = false },
            onCheckUpdates = { viewModel.checkForUpdates() },
            onDownload = {
                latestRelease?.downloadUrl?.let { url ->
                    uriHandler.openUri(url)
                }
            }
        )
    }
    
    // About Dialog
    if (showAboutDialog) {
        AboutDialog(
            onDismiss = { showAboutDialog = false },
            onPrivacyPolicy = { uriHandler.openUri("https://ndomog.com/privacy") },
            onTermsOfService = { uriHandler.openUri("https://ndomog.com/terms") }
        )
    }
}

data class SettingItem(
    val label: String,
    val icon: ImageVector,
    val action: () -> Unit
)

@Composable
fun SettingSection(
    title: String,
    icon: ImageVector,
    items: List<SettingItem>,
    subtitle: String? = null,
    footer: @Composable (() -> Unit)? = null
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = NdomogColors.DarkCard.copy(alpha = 0.6f)),
        border = BorderStroke(1.dp, NdomogColors.Primary.copy(alpha = 0.2f)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = icon,
                        contentDescription = title,
                        tint = NdomogColors.Primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        title,
                        style = MaterialTheme.typography.titleSmall.copy(
                            color = NdomogColors.TextLight,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
                if (subtitle != null) {
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall.copy(color = NdomogColors.TextMuted),
                        modifier = Modifier.padding(start = 28.dp, top = 2.dp)
                    )
                }
            }

            Divider(color = NdomogColors.DarkBorder.copy(alpha = 0.3f))

            items.forEachIndexed { index, item ->
                SettingItemRow(item = item)
                if (index < items.size - 1) {
                    Divider(color = NdomogColors.DarkBorder.copy(alpha = 0.3f))
                }
            }
            
            footer?.invoke()
        }
    }
}

@Composable
fun SettingItemRow(item: SettingItem) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = item.action)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = item.icon,
                contentDescription = item.label,
                tint = NdomogColors.TextMuted,
                modifier = Modifier.size(18.dp)
            )
            Text(
                item.label,
                style = MaterialTheme.typography.bodyMedium.copy(color = NdomogColors.TextLight),
                modifier = Modifier.padding(start = 12.dp)
            )
        }
        Icon(
            Icons.Filled.ChevronRight,
            contentDescription = "Navigate",
            tint = NdomogColors.TextMuted,
            modifier = Modifier.size(18.dp)
        )
    }
}

@Composable
fun ChangePasswordDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String) -> Unit
) {
    var oldPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var showOldPassword by remember { mutableStateOf(false) }
    var showNewPassword by remember { mutableStateOf(false) }
    var showConfirmPassword by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = NdomogColors.DarkCard,
        title = {
            Text("Change Password", color = NdomogColors.TextLight)
        },
        text = {
            Column {
                // Old Password Field
                OutlinedTextField(
                    value = oldPassword,
                    onValueChange = { oldPassword = it; error = null },
                    label = { Text("Current Password", color = NdomogColors.TextMuted) },
                    visualTransformation = if (showOldPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showOldPassword = !showOldPassword }) {
                            Icon(
                                if (showOldPassword) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                                contentDescription = null,
                                tint = NdomogColors.TextMuted
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = NdomogColors.DarkBorder,
                        focusedBorderColor = NdomogColors.Primary,
                        unfocusedTextColor = NdomogColors.TextLight,
                        focusedTextColor = NdomogColors.TextLight
                    ),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                )
                Spacer(modifier = Modifier.height(12.dp))
                
                // New Password Field
                OutlinedTextField(
                    value = newPassword,
                    onValueChange = { newPassword = it; error = null },
                    label = { Text("New Password", color = NdomogColors.TextMuted) },
                    visualTransformation = if (showNewPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showNewPassword = !showNewPassword }) {
                            Icon(
                                if (showNewPassword) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                                contentDescription = null,
                                tint = NdomogColors.TextMuted
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = NdomogColors.DarkBorder,
                        focusedBorderColor = NdomogColors.Primary,
                        unfocusedTextColor = NdomogColors.TextLight,
                        focusedTextColor = NdomogColors.TextLight
                    ),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                )
                Spacer(modifier = Modifier.height(12.dp))
                
                // Confirm Password Field
                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it; error = null },
                    label = { Text("Confirm Password", color = NdomogColors.TextMuted) },
                    visualTransformation = if (showConfirmPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        IconButton(onClick = { showConfirmPassword = !showConfirmPassword }) {
                            Icon(
                                if (showConfirmPassword) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                                contentDescription = null,
                                tint = NdomogColors.TextMuted
                            )
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = NdomogColors.DarkBorder,
                        focusedBorderColor = NdomogColors.Primary,
                        unfocusedTextColor = NdomogColors.TextLight,
                        focusedTextColor = NdomogColors.TextLight
                    ),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                )
                if (error != null) {
                    Text(
                        error!!,
                        color = NdomogColors.Error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    when {
                        oldPassword.isEmpty() -> error = "Current password is required"
                        newPassword.length < 6 -> error = "New password must be at least 6 characters"
                        newPassword != confirmPassword -> error = "Passwords don't match"
                        else -> onConfirm(oldPassword, newPassword)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = NdomogColors.Primary)
            ) {
                Text("Update", color = NdomogColors.TextOnPrimary)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = NdomogColors.TextMuted)
            }
        }
    )
}

@Composable
fun PinSetupDialog(
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var pin by remember { mutableStateOf("") }
    var confirmPin by remember { mutableStateOf("") }
    var step by remember { mutableIntStateOf(1) }
    var error by remember { mutableStateOf<String?>(null) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = NdomogColors.DarkCard,
        title = {
            Text(
                if (step == 1) "Create PIN" else "Confirm PIN",
                color = NdomogColors.TextLight
            )
        },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    if (step == 1) "Enter a 4-digit PIN" else "Re-enter your PIN",
                    color = NdomogColors.TextMuted,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
                OutlinedTextField(
                    value = if (step == 1) pin else confirmPin,
                    onValueChange = { value ->
                        if (value.length <= 4 && value.all { it.isDigit() }) {
                            if (step == 1) pin = value else confirmPin = value
                            error = null
                        }
                    },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = NdomogColors.DarkBorder,
                        focusedBorderColor = NdomogColors.Primary,
                        unfocusedTextColor = NdomogColors.TextLight,
                        focusedTextColor = NdomogColors.TextLight
                    ),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    singleLine = true
                )
                if (error != null) {
                    Text(
                        error!!,
                        color = NdomogColors.Error,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (step == 1) {
                        if (pin.length == 4) {
                            step = 2
                        } else {
                            error = "PIN must be 4 digits"
                        }
                    } else {
                        if (confirmPin == pin) {
                            onConfirm(pin)
                        } else {
                            error = "PINs don't match"
                            confirmPin = ""
                        }
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = NdomogColors.Primary)
            ) {
                Text(if (step == 1) "Next" else "Confirm", color = NdomogColors.TextOnPrimary)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = NdomogColors.TextMuted)
            }
        }
    )
}

@Composable
fun VersionInfoDialog(
    currentVersion: String,
    buildNumber: String,
    updateAvailable: Boolean,
    latestVersion: String?,
    onDismiss: () -> Unit,
    onCheckUpdates: () -> Unit,
    onDownload: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = NdomogColors.DarkCard,
        title = {
            Text("Version Info", color = NdomogColors.TextLight)
        },
        text = {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Current Version:", color = NdomogColors.TextMuted)
                    Text("v$currentVersion", color = NdomogColors.TextLight, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Build Number:", color = NdomogColors.TextMuted)
                    Text(buildNumber, color = NdomogColors.TextLight)
                }
                
                if (updateAvailable && latestVersion != null) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = NdomogColors.Success.copy(alpha = 0.2f)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                "Update Available!",
                                color = NdomogColors.Success,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Version $latestVersion is available for download.",
                                color = NdomogColors.TextMuted,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                } else {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "You're on the latest version!",
                        color = NdomogColors.TextMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        },
        confirmButton = {
            if (updateAvailable) {
                Button(
                    onClick = onDownload,
                    colors = ButtonDefaults.buttonColors(containerColor = NdomogColors.Primary)
                ) {
                    Icon(Icons.Filled.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Download Update", color = NdomogColors.TextOnPrimary)
                }
            } else {
                Button(
                    onClick = onCheckUpdates,
                    colors = ButtonDefaults.buttonColors(containerColor = NdomogColors.Primary)
                ) {
                    Icon(Icons.Filled.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Check for Updates", color = NdomogColors.TextOnPrimary)
                }
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Close", color = NdomogColors.TextMuted)
            }
        }
    )
}

@Composable
fun AboutDialog(
    onDismiss: () -> Unit,
    onPrivacyPolicy: () -> Unit,
    onTermsOfService: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = NdomogColors.DarkCard,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(32.dp),
                    shape = RoundedCornerShape(8.dp),
                    color = NdomogColors.Primary
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Icon(
                            Icons.Filled.Settings,
                            contentDescription = null,
                            tint = NdomogColors.TextOnPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                Spacer(modifier = Modifier.width(12.dp))
                Text("About Ndomog", color = NdomogColors.TextLight)
            }
        },
        text = {
            Column {
                Text(
                    "Ndomog Investment is a comprehensive inventory management solution designed to help businesses track their stock, monitor profits, and make data-driven decisions.",
                    color = NdomogColors.TextMuted,
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(16.dp))
                
                Divider(color = NdomogColors.DarkBorder)
                Spacer(modifier = Modifier.height(12.dp))
                
                Text("Features:", color = NdomogColors.TextLight, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                listOf(
                    "Real-time inventory tracking",
                    "Profit & cost analysis",
                    "Low stock alerts",
                    "Activity logging",
                    "Multi-user support"
                ).forEach { feature ->
                    Row(modifier = Modifier.padding(vertical = 2.dp)) {
                        Text("•", color = NdomogColors.Primary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(feature, color = NdomogColors.TextMuted, style = MaterialTheme.typography.bodySmall)
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                Divider(color = NdomogColors.DarkBorder)
                Spacer(modifier = Modifier.height(12.dp))
                
                // Links
                TextButton(
                    onClick = onPrivacyPolicy,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Filled.PrivacyTip, contentDescription = null, tint = NdomogColors.Primary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Privacy Policy", color = NdomogColors.Primary)
                    Spacer(modifier = Modifier.weight(1f))
                    Icon(Icons.Filled.OpenInNew, contentDescription = null, tint = NdomogColors.TextMuted, modifier = Modifier.size(14.dp))
                }
                
                TextButton(
                    onClick = onTermsOfService,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Filled.Description, contentDescription = null, tint = NdomogColors.Primary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Terms of Service", color = NdomogColors.Primary)
                    Spacer(modifier = Modifier.weight(1f))
                    Icon(Icons.Filled.OpenInNew, contentDescription = null, tint = NdomogColors.TextMuted, modifier = Modifier.size(14.dp))
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "© 2024 Ndomog Investment. All rights reserved.",
                    color = NdomogColors.TextMuted,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close", color = NdomogColors.Primary)
            }
        },
        dismissButton = {}
    )
}
