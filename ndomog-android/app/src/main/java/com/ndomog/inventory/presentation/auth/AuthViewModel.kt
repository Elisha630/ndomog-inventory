package com.ndomog.inventory.presentation.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ndomog.inventory.data.local.ProfileDao
import com.ndomog.inventory.data.models.Profile
import com.ndomog.inventory.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class AuthViewModel(
    private val authRepository: AuthRepository,
    private val profileDao: ProfileDao
) : ViewModel() {

    private val usernameRegex = Regex("^[a-z0-9_-]{3,20}$")

    private fun normalizeUsername(input: String): String {
        return input.trim().removePrefix("@").lowercase()
    }

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState

    private val _loginState = MutableStateFlow<LoginState>(LoginState.Idle)
    val loginState: StateFlow<LoginState> = _loginState

    private val _usernameRequired = MutableStateFlow(false)
    val usernameRequired: StateFlow<Boolean> = _usernameRequired

    private val _usernameState = MutableStateFlow<UsernameState>(UsernameState.Idle)
    val usernameState: StateFlow<UsernameState> = _usernameState

    init {
        checkAuthState()
    }

    private fun checkAuthState() {
        viewModelScope.launch {
            if (authRepository.isLoggedIn()) {
                _authState.value = AuthState.Authenticated
                handlePostAuth()
            } else {
                _authState.value = AuthState.Unauthenticated
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            val result = authRepository.signIn(email, password)
            result.onSuccess {
                _loginState.value = LoginState.Success
                _authState.value = AuthState.Authenticated
                handlePostAuth()
            }.onFailure { exception ->
                val userFriendlyMessage = when {
                    exception.message?.contains("Invalid login credentials", ignoreCase = true) == true -> 
                        "Invalid email or password. Please try again."
                    exception.message?.contains("Email not confirmed", ignoreCase = true) == true -> 
                        "Please verify your email before logging in."
                    exception.message?.contains("User not found", ignoreCase = true) == true -> 
                        "This email is not registered. Please sign up first."
                    exception.message?.contains("unauthorized", ignoreCase = true) == true -> 
                        "Authentication failed. Please check your credentials."
                    else -> "Login failed. Please try again later."
                }
                _loginState.value = LoginState.Error(userFriendlyMessage)
            }
        }
    }

    fun signup(email: String, password: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            val result = authRepository.signUp(email, password)
            result.onSuccess {
                _loginState.value = LoginState.Success
                handlePostAuth()
            }.onFailure { exception ->
                val userFriendlyMessage = when {
                    exception.message?.contains("already registered", ignoreCase = true) == true -> 
                        "This email is already registered. Please log in instead."
                    exception.message?.contains("weak password", ignoreCase = true) == true -> 
                        "Password is too weak. Use at least 8 characters."
                    else -> "Sign up failed. Please try again."
                }
                _loginState.value = LoginState.Error(userFriendlyMessage)
            }
        }
    }

    fun setUsername(username: String) {
        val normalized = normalizeUsername(username)
        if (normalized.isBlank()) {
            _usernameState.value = UsernameState.Error("Username cannot be empty")
            return
        }
        if (!usernameRegex.matches(normalized)) {
            _usernameState.value = UsernameState.Error("Use 3-20 chars: a-z, 0-9, _ or -")
            return
        }

        viewModelScope.launch {
            _usernameState.value = UsernameState.Loading
            val currentUser = authRepository.getCurrentUser()
            val userId = currentUser?.id
            val email = currentUser?.email ?: authRepository.getEmailFromSession()

            if (userId == null || email.isNullOrBlank()) {
                _usernameState.value = UsernameState.Error("User session not available. Please log in again.")
                return@launch
            }

            val updateResult = authRepository.updateProfileUsername(userId, normalized, email)
            if (updateResult.isSuccess) {
                val updated = updateResult.getOrNull()
                if (updated != null) {
                    profileDao.insertProfile(updated)
                }
                _usernameRequired.value = false
                _usernameState.value = UsernameState.Success
            } else {
                _usernameState.value = UsernameState.Error(updateResult.exceptionOrNull()?.message ?: "Failed to save username")
            }
        }
    }

    fun onLoggedOut() {
        _authState.value = AuthState.Unauthenticated
        _loginState.value = LoginState.Idle
        _usernameRequired.value = false
        _usernameState.value = UsernameState.Idle
    }

    fun sendPasswordResetEmail(email: String) {
        viewModelScope.launch {
            _loginState.value = LoginState.Loading
            val result = authRepository.sendPasswordResetEmail(email)
            result.onSuccess {
                _loginState.value = LoginState.Success
            }.onFailure {
                _loginState.value = LoginState.Error("Failed to send reset email. Please try again later.")
            }
        }
    }

    private suspend fun handlePostAuth() {
        val currentUser = authRepository.getCurrentUser()
        if (currentUser == null) {
            _authState.value = AuthState.Unauthenticated
            return
        }

        val userId = currentUser.id
        val email = currentUser.email ?: authRepository.getEmailFromSession()

        val profile = authRepository.fetchProfile(userId)
            ?: profileDao.getProfileById(userId)

        if (profile == null) {
            if (!email.isNullOrBlank()) {
                authRepository.upsertProfile(Profile(id = userId, email = email, username = null, avatarUrl = null))
            }
            _usernameRequired.value = true
            return
        }

        if (profile.email.isBlank() && !email.isNullOrBlank()) {
            authRepository.upsertProfile(profile.copy(email = email))
        }

        _usernameRequired.value = profile.username.isNullOrBlank()
    }
}

sealed class AuthState {
    object Loading : AuthState()
    object Authenticated : AuthState()
    object Unauthenticated : AuthState()
}

sealed class LoginState {
    object Idle : LoginState()
    object Loading : LoginState()
    object Success : LoginState()
    data class Error(val message: String) : LoginState()
}

sealed class UsernameState {
    object Idle : UsernameState()
    object Loading : UsernameState()
    object Success : UsernameState()
    data class Error(val message: String) : UsernameState()
}
