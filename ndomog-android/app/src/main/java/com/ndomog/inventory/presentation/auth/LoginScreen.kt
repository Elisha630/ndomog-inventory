package com.ndomog.inventory.presentation.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ndomog.inventory.presentation.theme.NdomogTheme
import com.ndomog.inventory.presentation.theme.NdomogColors

@Composable
fun LoginScreen(
    authViewModel: AuthViewModel,
    onLoginSuccess: () -> Unit
) {
    val authState by authViewModel.authState.collectAsState()
    val loginState by authViewModel.loginState.collectAsState()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var isLogin by remember { mutableStateOf(true) }

    LaunchedEffect(authState) {
        if (authState is AuthState.Authenticated) {
            onLoginSuccess()
        }
    }

    NdomogTheme {
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .background(NdomogColors.DarkBackground),
            color = NdomogColors.DarkBackground
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Logo and Title Card
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 32.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = NdomogColors.DarkCard.copy(alpha = 0.6f)
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Amber Logo Box (matching web Logo component)
                        Surface(
                            modifier = Modifier
                                .size(64.dp),
                            shape = RoundedCornerShape(12.dp),
                            color = NdomogColors.Primary
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize()
                            ) {
                                Icon(
                                    Icons.Filled.Inventory2,
                                    contentDescription = "Ndomog Logo",
                                    tint = NdomogColors.TextOnPrimary,
                                    modifier = Modifier.size(32.dp)
                                )
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(16.dp))

                        Text(
                            "Ndomog Investment",
                            style = MaterialTheme.typography.headlineMedium.copy(
                                fontSize = 28.sp,
                                color = NdomogColors.TextLight
                            ),
                            modifier = Modifier.padding(bottom = 8.dp)
                        )

                        Text(
                            "Sign in to access your inventory",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = NdomogColors.TextMuted
                            )
                        )
                    }
                }

                // Email Field
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email", color = NdomogColors.TextMuted) },
                    leadingIcon = {
                        Icon(
                            Icons.Filled.Email,
                            contentDescription = "Email",
                            tint = NdomogColors.TextMuted
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = NdomogColors.InputBorder,
                        focusedBorderColor = NdomogColors.Primary,
                        unfocusedContainerColor = NdomogColors.InputBackground.copy(alpha = 0.5f),
                        focusedContainerColor = NdomogColors.InputBackground.copy(alpha = 0.5f),
                        unfocusedTextColor = NdomogColors.TextLight,
                        focusedTextColor = NdomogColors.TextLight,
                        cursorColor = NdomogColors.Primary
                    ),
                    shape = RoundedCornerShape(8.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    singleLine = true
                )

                // Password Field
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password", color = NdomogColors.TextMuted) },
                    leadingIcon = {
                        Icon(
                            Icons.Filled.Lock,
                            contentDescription = "Password",
                            tint = NdomogColors.TextMuted
                        )
                    },
                    trailingIcon = {
                        IconButton(
                            onClick = { showPassword = !showPassword },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                if (showPassword) Icons.Filled.Visibility else Icons.Filled.VisibilityOff,
                                contentDescription = "Toggle password",
                                tint = NdomogColors.TextMuted
                            )
                        }
                    },
                    visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedBorderColor = NdomogColors.InputBorder,
                        focusedBorderColor = NdomogColors.Primary,
                        unfocusedContainerColor = NdomogColors.InputBackground.copy(alpha = 0.5f),
                        focusedContainerColor = NdomogColors.InputBackground.copy(alpha = 0.5f),
                        unfocusedTextColor = NdomogColors.TextLight,
                        focusedTextColor = NdomogColors.TextLight,
                        cursorColor = NdomogColors.Primary
                    ),
                    shape = RoundedCornerShape(8.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    singleLine = true
                )

                // Login Button
                if (loginState is LoginState.Loading) {
                    CircularProgressIndicator(
                        modifier = Modifier
                            .size(48.dp)
                            .padding(16.dp),
                        color = NdomogColors.Primary
                    )
                } else {
                    Button(
                        onClick = {
                            if (isLogin) {
                                authViewModel.login(email, password)
                            } else {
                                authViewModel.signup(email, password)
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = NdomogColors.Primary
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            if (isLogin) "Sign In" else "Sign Up",
                            color = NdomogColors.TextOnPrimary,
                            style = MaterialTheme.typography.labelLarge.copy(
                                fontSize = 16.sp
                            ),
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                        )
                    }
                }

                // Sign Up/In Toggle
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        if (isLogin) "Don't have an account? " else "Already have an account? ",
                        color = NdomogColors.TextMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                    TextButton(
                        onClick = { isLogin = !isLogin },
                        modifier = Modifier.wrapContentWidth()
                    ) {
                        Text(
                            if (isLogin) "Sign up" else "Sign in",
                            color = NdomogColors.Primary,
                            style = MaterialTheme.typography.bodySmall.copy(
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                            )
                        )
                    }
                }

                // Error Message
                if (loginState is LoginState.Error) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = NdomogColors.ErrorBackground
                        ),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = (loginState as LoginState.Error).message,
                            color = NdomogColors.ErrorText,
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
    }
}
