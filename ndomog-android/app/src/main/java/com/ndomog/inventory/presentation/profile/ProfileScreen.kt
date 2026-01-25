package com.ndomog.inventory.presentation.profile

import android.annotation.SuppressLint
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.ndomog.inventory.di.ViewModelFactory

// Color constants matching design
private val DarkBackground = Color(0xFF0F172A)
private val DarkCard = Color(0xFF1E293B)
private val AmberPrimary = Color(0xFFF59E0B)
private val TextLight = Color(0xFFFFFFFF)
private val TextMuted = Color(0xFF94A3B8)
private val RedError = Color(0xFFF87171)

@SuppressLint("UnusedMaterial3ScaffoldPaddingParameter")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onBack: () -> Unit,
    viewModelFactory: ViewModelFactory
) {
    val viewModel: ProfileViewModel = viewModel(factory = viewModelFactory)
    val userEmail by viewModel.userEmail.collectAsState()
    val username by viewModel.username.collectAsState()
    val avatarUrl by viewModel.avatarUrl.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    var isEditingUsername by remember { mutableStateOf(false) }
    var newUsername by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        "Profile Settings",
                        color = TextLight,
                        style = MaterialTheme.typography.headlineSmall
                    ) 
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back", tint = AmberPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DarkCard,
                    scrolledContainerColor = DarkCard
                )
            )
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(DarkBackground)
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    color = AmberPrimary,
                    modifier = Modifier.padding(32.dp)
                )
            } else if (error != null) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF7F1D1D)),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text(
                        "Error: $error",
                        color = Color(0xFFFCA5A5),
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            } else {
                // Avatar Section
                Card(
                    modifier = Modifier
                        .padding(bottom = 24.dp)
                        .background(DarkCard),
                    colors = CardDefaults.cardColors(
                        containerColor = DarkCard.copy(alpha = 0.6f)
                    ),
                    shape = RoundedCornerShape(16.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(96.dp)
                                .border(
                                    width = 3.dp,
                                    color = AmberPrimary,
                                    shape = CircleShape
                                )
                                .background(Color(0xFF0F172A), shape = CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            if (avatarUrl != null) {
                                AsyncImage(
                                    model = avatarUrl,
                                    contentDescription = "Avatar",
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(Color(0xFF0F172A), shape = CircleShape)
                                )
                            } else {
                                Icon(
                                    Icons.Filled.Person,
                                    contentDescription = "No avatar",
                                    tint = AmberPrimary,
                                    modifier = Modifier.size(48.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        if (isEditingUsername) {
                            OutlinedTextField(
                                value = newUsername,
                                onValueChange = { newUsername = it },
                                modifier = Modifier.fillMaxWidth(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    unfocusedBorderColor = Color(0xFF334155),
                                    focusedBorderColor = AmberPrimary,
                                    unfocusedContainerColor = Color(0xFF1E293B).copy(alpha = 0.5f),
                                    focusedContainerColor = Color(0xFF1E293B).copy(alpha = 0.5f),
                                    unfocusedTextColor = Color.White,
                                    focusedTextColor = Color.White
                                ),
                                shape = RoundedCornerShape(8.dp)
                            )
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
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
                                    colors = ButtonDefaults.buttonColors(containerColor = AmberPrimary),
                                    shape = RoundedCornerShape(8.dp)
                                ) {
                                    Text("Save", color = Color(0xFF111827), fontWeight = FontWeight.Bold)
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
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.Center,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    username ?: "Set username",
                                    style = MaterialTheme.typography.headlineSmall.copy(
                                        color = TextLight,
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
                                        tint = AmberPrimary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            userEmail ?: "N/A",
                            style = MaterialTheme.typography.bodySmall.copy(color = TextMuted)
                        )
                    }
                }

                // Account Security Section
                SettingSection(
                    title = "Account Security",
                    icon = Icons.Filled.Security,
                    items = listOf(
                        SettingItem(
                            label = "Change Password",
                            icon = Icons.Filled.Lock,
                            action = { /* TODO */ }
                        )
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                // PIN Lock Section
                SettingSection(
                    title = "PIN Lock",
                    icon = Icons.Filled.Fingerprint,
                    items = listOf(
                        SettingItem(
                            label = "Set Up PIN Lock",
                            icon = Icons.Filled.Lock,
                            action = { /* TODO */ }
                        )
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Accessibility Section
                SettingSection(
                    title = "Accessibility",
                    icon = Icons.Filled.Accessibility,
                    items = listOf(
                        SettingItem(
                            label = "Dark Mode",
                            icon = Icons.Filled.DarkMode,
                            action = { /* TODO */ }
                        ),
                        SettingItem(
                            label = "Text Size",
                            icon = Icons.Filled.TextFields,
                            action = { /* TODO */ }
                        )
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                // App Management Section
                SettingSection(
                    title = "App Management",
                    icon = Icons.Filled.Settings,
                    items = listOf(
                        SettingItem(
                            label = "Version Info",
                            icon = Icons.Filled.Info,
                            action = { /* TODO */ }
                        ),
                        SettingItem(
                            label = "About",
                            icon = Icons.Filled.Help,
                            action = { /* TODO */ }
                        )
                    )
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Sign Out Button
                Button(
                    onClick = { /* TODO: Handle logout */ },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = RedError
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(
                        Icons.Filled.ExitToApp,
                        contentDescription = "Sign Out",
                        tint = Color.White,
                        modifier = Modifier
                            .size(18.dp)
                            .padding(end = 8.dp)
                    )
                    Text(
                        "Sign Out",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
fun SettingSection(
    title: String,
    icon: ImageVector,
    items: List<SettingItem>
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = DarkCard.copy(alpha = 0.6f)
        ),
        border = BorderStroke(1.dp, AmberPrimary.copy(alpha = 0.2f)),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Section Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = title,
                    tint = AmberPrimary,
                    modifier = Modifier
                        .size(20.dp)
                        .padding(end = 8.dp)
                )
                Text(
                    title,
                    style = MaterialTheme.typography.titleSmall.copy(
                        color = TextLight,
                        fontWeight = FontWeight.Bold
                    )
                )
            }

            Divider(color = Color(0xFF334155).copy(alpha = 0.3f))

            // Section Items
            items.forEachIndexed { index, item ->
                SettingItemRow(item = item)
                if (index < items.size - 1) {
                    Divider(color = Color(0xFF334155).copy(alpha = 0.3f))
                }
            }
        }
    }
}

@Composable
fun SettingItemRow(item: SettingItem) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp),
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
                tint = TextMuted,
                modifier = Modifier.size(18.dp)
            )
            Text(
                item.label,
                style = MaterialTheme.typography.bodySmall.copy(color = TextLight),
                modifier = Modifier.padding(start = 12.dp)
            )
        }
        IconButton(
            onClick = item.action,
            modifier = Modifier.size(28.dp)
        ) {
            Icon(
                Icons.Filled.ChevronRight,
                contentDescription = "Navigate",
                tint = TextMuted,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

data class SettingItem(
    val label: String,
    val icon: ImageVector,
    val action: () -> Unit
)
