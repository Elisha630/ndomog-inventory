package com.ndomog.inventory.presentation.theme

import androidx.compose.ui.graphics.Color

/**
 * Shared color constants for use across composables.
 * These match the web app's CSS design system exactly.
 * 
 * Usage: Import these in your composables instead of defining colors locally.
 * Example: import com.ndomog.inventory.presentation.theme.NdomogColors
 */
object NdomogColors {
    // Primary (Amber)
    val Primary = Color(0xFFF59E0B)
    val PrimaryDark = Color(0xFFD97706)
    
    // Dark Theme Backgrounds
    val DarkBackground = Color(0xFF0A0E14)
    val DarkCard = Color(0xFF0F1419)
    val DarkSurface = Color(0xFF0F1419)
    val DarkSecondary = Color(0xFF1A1F26)
    val DarkBorder = Color(0xFF232B36)
    
    // Dark Theme Text
    val TextLight = Color(0xFFF8FAFC)
    val TextMuted = Color(0xFF94A3B8)
    val TextOnPrimary = Color(0xFF0A0E14)
    
    // Light Theme Backgrounds
    val LightBackground = Color(0xFFFFFFFF)
    val LightCard = Color(0xFFFAFAFA)
    val LightSecondary = Color(0xFFF5F5F5)
    val LightBorder = Color(0xFFE5E7EB)
    
    // Light Theme Text
    val LightTextPrimary = Color(0xFF0F172A)
    val LightTextMuted = Color(0xFF64748B)
    
    // Status Colors
    val Error = Color(0xFFEF4444)
    val ErrorBackground = Color(0xFF7F1D1D)
    val ErrorText = Color(0xFFFCA5A5)
    val Success = Color(0xFF16A34A)
    val Warning = Color(0xFFF59E0B)
    
    // Additional UI Colors
    val InputBorder = Color(0xFF334155)
    val InputBackground = Color(0xFF1E293B)
    val Divider = Color(0xFF334155)
}
