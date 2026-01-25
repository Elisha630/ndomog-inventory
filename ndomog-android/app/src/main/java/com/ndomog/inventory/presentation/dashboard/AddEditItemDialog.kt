package com.ndomog.inventory.presentation.dashboard

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import com.ndomog.inventory.data.models.Item
import com.ndomog.inventory.presentation.theme.NdomogColors
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditItemDialog(
    showDialog: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (item: Item) -> Unit,
    existingItem: Item? = null,
    categories: List<String> = emptyList()
) {
    if (!showDialog) return

    var name by remember { mutableStateOf(existingItem?.name ?: "") }
    var category by remember { mutableStateOf(existingItem?.category ?: "") }
    var isNewCategory by remember { mutableStateOf(false) }
    var newCategoryName by remember { mutableStateOf("") }
    var details by remember { mutableStateOf(existingItem?.details ?: "") }
    var photoUrl by remember { mutableStateOf(existingItem?.photoUrl ?: "") }
    var buyingPrice by remember { mutableStateOf(existingItem?.buyingPrice?.toString() ?: "0") }
    var sellingPrice by remember { mutableStateOf(existingItem?.sellingPrice?.toString() ?: "0") }
    var quantity by remember { mutableStateOf(existingItem?.quantity?.toString() ?: "0") }
    var lowStockThreshold by remember { mutableStateOf(existingItem?.lowStockThreshold?.toString() ?: "5") }
    
    var showCategoryDropdown by remember { mutableStateOf(false) }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    
    // Image picker launcher
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            selectedImageUri = it
            // TODO: Upload to storage and get URL
            photoUrl = it.toString()
        }
    }
    
    // Camera launcher
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        bitmap?.let {
            // TODO: Save bitmap, upload to storage and get URL
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = NdomogColors.DarkCard
            ),
            shape = RoundedCornerShape(16.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(20.dp)
            ) {
                // Header with Package icon
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            modifier = Modifier.size(40.dp),
                            shape = RoundedCornerShape(10.dp),
                            color = NdomogColors.Primary
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize()
                            ) {
                                Icon(
                                    Icons.Filled.Inventory2,
                                    contentDescription = null,
                                    tint = NdomogColors.TextOnPrimary,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = if (existingItem == null) "Add New Item" else "Edit Item",
                            style = MaterialTheme.typography.headlineSmall.copy(
                                color = NdomogColors.TextLight,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Filled.Close,
                            contentDescription = "Close",
                            tint = NdomogColors.TextMuted
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Item Name
                Text(
                    "Item Name *",
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = NdomogColors.TextMuted,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = { Text("e.g., Wireless Mouse", color = NdomogColors.TextMuted.copy(alpha = 0.5f)) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = dialogTextFieldColors(),
                    shape = RoundedCornerShape(8.dp),
                    singleLine = true
                )
                
                Spacer(modifier = Modifier.height(16.dp))

                // Type / Category with dropdown
                Text(
                    "Type / Category *",
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = NdomogColors.TextMuted,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                
                ExposedDropdownMenuBox(
                    expanded = showCategoryDropdown,
                    onExpandedChange = { showCategoryDropdown = it }
                ) {
                    OutlinedTextField(
                        value = if (isNewCategory) newCategoryName else category,
                        onValueChange = { 
                            if (isNewCategory) newCategoryName = it.uppercase()
                            else category = it.uppercase()
                        },
                        placeholder = { Text("Select a category", color = NdomogColors.TextMuted.copy(alpha = 0.5f)) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        colors = dialogTextFieldColors(),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true,
                        readOnly = !isNewCategory,
                        trailingIcon = {
                            ExposedDropdownMenuDefaults.TrailingIcon(expanded = showCategoryDropdown)
                        }
                    )
                    
                    ExposedDropdownMenu(
                        expanded = showCategoryDropdown,
                        onDismissRequest = { showCategoryDropdown = false },
                        modifier = Modifier.background(NdomogColors.DarkSecondary)
                    ) {
                        // Add New Category option
                        DropdownMenuItem(
                            text = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        Icons.Filled.Add,
                                        contentDescription = null,
                                        tint = NdomogColors.Primary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Add New Category", color = NdomogColors.Primary)
                                }
                            },
                            onClick = {
                                isNewCategory = true
                                newCategoryName = ""
                                showCategoryDropdown = false
                            }
                        )
                        
                        // Divider
                        if (categories.isNotEmpty()) {
                            HorizontalDivider(color = NdomogColors.DarkBorder)
                        }
                        
                        // Existing categories
                        categories.forEach { cat ->
                            DropdownMenuItem(
                                text = { Text(cat, color = NdomogColors.TextLight) },
                                onClick = {
                                    category = cat
                                    isNewCategory = false
                                    showCategoryDropdown = false
                                }
                            )
                        }
                    }
                }
                
                // Show new category input if adding new
                if (isNewCategory) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = newCategoryName,
                        onValueChange = { newCategoryName = it.uppercase() },
                        placeholder = { Text("Enter new category name", color = NdomogColors.TextMuted.copy(alpha = 0.5f)) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = dialogTextFieldColors(),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))

                // Details (optional)
                Text(
                    "Details (optional)",
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = NdomogColors.TextMuted,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                OutlinedTextField(
                    value = details,
                    onValueChange = { details = it },
                    placeholder = { Text("Additional details about the item...", color = NdomogColors.TextMuted.copy(alpha = 0.5f)) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp),
                    colors = dialogTextFieldColors(),
                    shape = RoundedCornerShape(8.dp),
                    maxLines = 3
                )
                
                Spacer(modifier = Modifier.height(16.dp))

                // Photo (optional)
                Text(
                    "Photo (optional)",
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = NdomogColors.TextMuted,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                
                if (photoUrl.isNotEmpty()) {
                    // Show photo preview with remove option
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp)
                            .clip(RoundedCornerShape(8.dp))
                    ) {
                        AsyncImage(
                            model = photoUrl,
                            contentDescription = "Item photo",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Cover
                        )
                        IconButton(
                            onClick = { 
                                photoUrl = ""
                                selectedImageUri = null
                            },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(4.dp)
                                .size(28.dp)
                                .background(NdomogColors.Error, RoundedCornerShape(4.dp))
                        ) {
                            Icon(
                                Icons.Filled.Close,
                                contentDescription = "Remove",
                                tint = NdomogColors.TextLight,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                } else {
                    // Upload and Camera buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Upload button
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .height(72.dp)
                                .clickable { imagePickerLauncher.launch("image/*") },
                            shape = RoundedCornerShape(8.dp),
                            color = NdomogColors.DarkSecondary,
                            border = androidx.compose.foundation.BorderStroke(1.dp, NdomogColors.DarkBorder)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxSize(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    Icons.Filled.Upload,
                                    contentDescription = "Upload",
                                    tint = NdomogColors.TextMuted,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    "Upload",
                                    color = NdomogColors.TextMuted,
                                    fontSize = 12.sp
                                )
                            }
                        }
                        
                        // Camera button
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .height(72.dp)
                                .clickable { cameraLauncher.launch(null) },
                            shape = RoundedCornerShape(8.dp),
                            color = NdomogColors.DarkSecondary,
                            border = androidx.compose.foundation.BorderStroke(1.dp, NdomogColors.DarkBorder)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxSize(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    Icons.Filled.CameraAlt,
                                    contentDescription = "Camera",
                                    tint = NdomogColors.TextMuted,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    "Camera",
                                    color = NdomogColors.TextMuted,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))

                // Pricing Row with KES
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Buying Price (KES)",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color = NdomogColors.TextMuted,
                                fontWeight = FontWeight.Medium
                            ),
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                        OutlinedTextField(
                            value = buyingPrice,
                            onValueChange = { buyingPrice = it },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.fillMaxWidth(),
                            colors = dialogTextFieldColors(),
                            shape = RoundedCornerShape(8.dp),
                            singleLine = true
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Selling Price (KES)",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color = NdomogColors.TextMuted,
                                fontWeight = FontWeight.Medium
                            ),
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                        OutlinedTextField(
                            value = sellingPrice,
                            onValueChange = { sellingPrice = it },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                            modifier = Modifier.fillMaxWidth(),
                            colors = dialogTextFieldColors(),
                            shape = RoundedCornerShape(8.dp),
                            singleLine = true
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(12.dp))

                // Quantity and Low Stock Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Quantity",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color = NdomogColors.TextMuted,
                                fontWeight = FontWeight.Medium
                            ),
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                        OutlinedTextField(
                            value = quantity,
                            onValueChange = { quantity = it },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            colors = dialogTextFieldColors(),
                            shape = RoundedCornerShape(8.dp),
                            singleLine = true
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Low Stock Alert",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color = NdomogColors.TextMuted,
                                fontWeight = FontWeight.Medium
                            ),
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                        OutlinedTextField(
                            value = lowStockThreshold,
                            onValueChange = { lowStockThreshold = it },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            colors = dialogTextFieldColors(),
                            shape = RoundedCornerShape(8.dp),
                            singleLine = true
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(24.dp))

                // Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = NdomogColors.TextMuted
                        )
                    ) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = {
                            val finalCategory = if (isNewCategory) newCategoryName.uppercase() else category.uppercase()
                            val newItem = existingItem?.copy(
                                name = name,
                                category = finalCategory,
                                details = details.ifEmpty { null },
                                photoUrl = photoUrl.ifEmpty { null },
                                buyingPrice = buyingPrice.toDoubleOrNull() ?: 0.0,
                                sellingPrice = sellingPrice.toDoubleOrNull() ?: 0.0,
                                quantity = quantity.toIntOrNull() ?: 0,
                                lowStockThreshold = lowStockThreshold.toIntOrNull() ?: 5
                            ) ?: Item(
                                id = UUID.randomUUID().toString(),
                                name = name,
                                category = finalCategory,
                                details = details.ifEmpty { null },
                                photoUrl = photoUrl.ifEmpty { null },
                                buyingPrice = buyingPrice.toDoubleOrNull() ?: 0.0,
                                sellingPrice = sellingPrice.toDoubleOrNull() ?: 0.0,
                                quantity = quantity.toIntOrNull() ?: 0,
                                lowStockThreshold = lowStockThreshold.toIntOrNull() ?: 5,
                                isDeleted = false,
                                createdBy = null,
                                createdAt = null,
                                updatedAt = null
                            )
                            onConfirm(newItem)
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = NdomogColors.Primary
                        ),
                        shape = RoundedCornerShape(8.dp),
                        enabled = name.isNotBlank() && (category.isNotBlank() || (isNewCategory && newCategoryName.isNotBlank()))
                    ) {
                        Text(
                            if (existingItem == null) "Add Item" else "Save Changes",
                            color = NdomogColors.TextOnPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun dialogTextFieldColors() = OutlinedTextFieldDefaults.colors(
    unfocusedBorderColor = NdomogColors.InputBorder,
    focusedBorderColor = NdomogColors.Primary,
    unfocusedContainerColor = NdomogColors.InputBackground.copy(alpha = 0.5f),
    focusedContainerColor = NdomogColors.InputBackground.copy(alpha = 0.5f),
    unfocusedTextColor = NdomogColors.TextLight,
    focusedTextColor = NdomogColors.TextLight,
    cursorColor = NdomogColors.Primary,
    unfocusedLabelColor = NdomogColors.TextMuted,
    focusedLabelColor = NdomogColors.Primary
)
