package com.ndomog.inventory.presentation.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ndomog.inventory.data.models.Item
import com.ndomog.inventory.presentation.theme.NdomogColors
import java.util.UUID

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEditItemDialog(
    showDialog: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (item: Item) -> Unit,
    existingItem: Item? = null
) {
    if (!showDialog) return

    var name by remember { mutableStateOf(existingItem?.name ?: "") }
    var category by remember { mutableStateOf(existingItem?.category ?: "") }
    var details by remember { mutableStateOf(existingItem?.details ?: "") }
    var buyingPrice by remember { mutableStateOf(existingItem?.buyingPrice?.toString() ?: "0") }
    var sellingPrice by remember { mutableStateOf(existingItem?.sellingPrice?.toString() ?: "0") }
    var quantity by remember { mutableStateOf(existingItem?.quantity?.toString() ?: "0") }
    var lowStockThreshold by remember { mutableStateOf(existingItem?.lowStockThreshold?.toString() ?: "5") }

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
                // Header
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
                            shape = RoundedCornerShape(8.dp),
                            color = NdomogColors.Primary
                        ) {
                            Box(
                                contentAlignment = Alignment.Center,
                                modifier = Modifier.fillMaxSize()
                            ) {
                                Icon(
                                    if (existingItem == null) Icons.Filled.Add else Icons.Filled.Edit,
                                    contentDescription = null,
                                    tint = NdomogColors.TextOnPrimary,
                                    modifier = Modifier.size(20.dp)
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
                    placeholder = { Text("Enter item name", color = NdomogColors.TextMuted.copy(alpha = 0.5f)) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = dialogTextFieldColors(),
                    shape = RoundedCornerShape(8.dp),
                    singleLine = true
                )
                
                Spacer(modifier = Modifier.height(12.dp))

                // Category
                Text(
                    "Category *",
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = NdomogColors.TextMuted,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                OutlinedTextField(
                    value = category,
                    onValueChange = { category = it.uppercase() },
                    placeholder = { Text("e.g., ELECTRONICS", color = NdomogColors.TextMuted.copy(alpha = 0.5f)) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = dialogTextFieldColors(),
                    shape = RoundedCornerShape(8.dp),
                    singleLine = true
                )
                
                Spacer(modifier = Modifier.height(12.dp))

                // Details
                Text(
                    "Details",
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = NdomogColors.TextMuted,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                OutlinedTextField(
                    value = details,
                    onValueChange = { details = it },
                    placeholder = { Text("Optional description", color = NdomogColors.TextMuted.copy(alpha = 0.5f)) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp),
                    colors = dialogTextFieldColors(),
                    shape = RoundedCornerShape(8.dp),
                    maxLines = 3
                )
                
                Spacer(modifier = Modifier.height(16.dp))

                // Price Row
                Text(
                    "Pricing",
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = NdomogColors.TextMuted,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = buyingPrice,
                        onValueChange = { buyingPrice = it },
                        label = { Text("Buying Price", color = NdomogColors.TextMuted, fontSize = 12.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f),
                        colors = dialogTextFieldColors(),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = sellingPrice,
                        onValueChange = { sellingPrice = it },
                        label = { Text("Selling Price", color = NdomogColors.TextMuted, fontSize = 12.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f),
                        colors = dialogTextFieldColors(),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true
                    )
                }
                
                Spacer(modifier = Modifier.height(12.dp))

                // Quantity Row
                Text(
                    "Stock",
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = NdomogColors.TextMuted,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = quantity,
                        onValueChange = { quantity = it },
                        label = { Text("Quantity", color = NdomogColors.TextMuted, fontSize = 12.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                        colors = dialogTextFieldColors(),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = lowStockThreshold,
                        onValueChange = { lowStockThreshold = it },
                        label = { Text("Low Stock Alert", color = NdomogColors.TextMuted, fontSize = 12.sp) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.weight(1f),
                        colors = dialogTextFieldColors(),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true
                    )
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
                            val newItem = existingItem?.copy(
                                name = name,
                                category = category,
                                details = details.ifEmpty { null },
                                buyingPrice = buyingPrice.toDoubleOrNull() ?: 0.0,
                                sellingPrice = sellingPrice.toDoubleOrNull() ?: 0.0,
                                quantity = quantity.toIntOrNull() ?: 0,
                                lowStockThreshold = lowStockThreshold.toIntOrNull() ?: 5
                            ) ?: Item(
                                id = UUID.randomUUID().toString(),
                                name = name,
                                category = category,
                                details = details.ifEmpty { null },
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
                        enabled = name.isNotBlank() && category.isNotBlank()
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
