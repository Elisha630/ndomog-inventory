package com.ndomog.inventory.presentation.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.ndomog.inventory.di.ViewModelFactory
import com.ndomog.inventory.presentation.theme.NdomogColors
import java.text.SimpleDateFormat
import java.util.*

data class Notification(
    val id: String,
    val userId: String?,
    val actionUserEmail: String,
    val action: String,
    val itemName: String,
    val details: String?,
    val isRead: Boolean,
    val createdAt: Date,
    val username: String? = null,
    val avatarUrl: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(
    onBack: () -> Unit,
    viewModelFactory: ViewModelFactory
) {
    val viewModel: NotificationsViewModel = viewModel(factory = viewModelFactory)
    val notifications by viewModel.notifications.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val unreadCount by viewModel.unreadCount.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Outlined.Notifications,
                            contentDescription = null,
                            tint = NdomogColors.Primary
                        )
                        Text(
                            "Notifications",
                            color = NdomogColors.TextLight,
                            style = MaterialTheme.typography.headlineSmall
                        )
                        if (unreadCount > 0) {
                            Surface(
                                shape = CircleShape,
                                color = NdomogColors.Error
                            ) {
                                Text(
                                    text = if (unreadCount > 9) "9+" else unreadCount.toString(),
                                    color = Color.White,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = NdomogColors.TextLight
                        )
                    }
                },
                actions = {
                    if (notifications.isNotEmpty()) {
                        TextButton(onClick = { viewModel.clearAllNotifications() }) {
                            Text(
                                "Clear all",
                                color = NdomogColors.TextMuted,
                                fontSize = 12.sp
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = NdomogColors.DarkCard
                )
            )
        },
        containerColor = NdomogColors.DarkBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (isLoading) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = NdomogColors.Primary,
                    trackColor = NdomogColors.DarkCard
                )
            }

            if (notifications.isEmpty() && !isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Outlined.Notifications,
                            contentDescription = null,
                            tint = NdomogColors.TextMuted.copy(alpha = 0.5f),
                            modifier = Modifier.size(64.dp)
                        )
                        Text(
                            "No notifications yet",
                            color = NdomogColors.TextMuted,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(notifications) { notification ->
                        NotificationItem(
                            notification = notification,
                            onDelete = { viewModel.deleteNotification(notification.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun NotificationItem(
    notification: Notification,
    onDelete: () -> Unit
) {
    val dateFormat = remember { SimpleDateFormat("MMM d, h:mm a", Locale.getDefault()) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (notification.isRead)
                NdomogColors.DarkCard
            else
                NdomogColors.DarkSecondary.copy(alpha = 0.7f)
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(NdomogColors.Primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                if (notification.avatarUrl != null) {
                    AsyncImage(
                        model = notification.avatarUrl,
                        contentDescription = notification.username ?: notification.actionUserEmail,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Text(
                        text = (notification.username ?: notification.actionUserEmail).firstOrNull()?.uppercase() ?: "U",
                        color = NdomogColors.Primary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = notification.username ?: notification.actionUserEmail.substringBefore("@"),
                        color = NdomogColors.TextLight,
                        fontWeight = FontWeight.Medium,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(" ", color = NdomogColors.TextMuted)
                    Text(
                        text = notification.action,
                        color = when (notification.action) {
                            "added" -> NdomogColors.Success
                            "removed" -> NdomogColors.Error
                            "updated" -> NdomogColors.Primary
                            else -> NdomogColors.TextMuted
                        },
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(" ", color = NdomogColors.TextMuted)
                    Text(
                        text = notification.itemName,
                        color = NdomogColors.TextLight,
                        fontWeight = FontWeight.Medium,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                if (notification.details != null) {
                    Text(
                        text = notification.details,
                        color = NdomogColors.TextMuted,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                Text(
                    text = dateFormat.format(notification.createdAt),
                    color = NdomogColors.TextMuted.copy(alpha = 0.7f),
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            // Delete button
            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    Icons.Filled.Delete,
                    contentDescription = "Delete",
                    tint = NdomogColors.TextMuted,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}
