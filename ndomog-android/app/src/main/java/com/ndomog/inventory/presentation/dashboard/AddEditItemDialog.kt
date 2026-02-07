package com.ndomog.inventory.presentation.dashboard

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Environment
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import coil.compose.AsyncImage
import com.ndomog.inventory.data.remote.SupabaseClient
import com.ndomog.inventory.data.models.Item
import com.ndomog.inventory.data.models.ItemPhoto
import com.ndomog.inventory.data.models.ItemPhotoInsert
import com.ndomog.inventory.presentation.theme.NdomogColors
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.storage.storage
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import kotlinx.coroutines.launch

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

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    
    var name by remember { mutableStateOf(existingItem?.name ?: "") }
    var category by remember { mutableStateOf(existingItem?.category ?: "") }
    var isNewCategory by remember { mutableStateOf(false) }
    var newCategoryName by remember { mutableStateOf("") }
    var details by remember { mutableStateOf(existingItem?.details ?: "") }
    val photoUrls = remember { mutableStateListOf<String>() }
    var buyingPrice by remember { mutableStateOf(existingItem?.buyingPrice?.toString() ?: "0") }
    var sellingPrice by remember { mutableStateOf(existingItem?.sellingPrice?.toString() ?: "0") }
    var quantity by remember { mutableStateOf(existingItem?.quantity?.toString() ?: "0") }
    var lowStockThreshold by remember { mutableStateOf(existingItem?.lowStockThreshold?.toString() ?: "5") }
    
    var showCategoryDropdown by remember { mutableStateOf(false) }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var tempPhotoUri by remember { mutableStateOf<Uri?>(null) }
    var showCameraError by remember { mutableStateOf(false) }
    var uploadError by remember { mutableStateOf<String?>(null) }
    var isUploading by remember { mutableStateOf(false) }
    var isLoadingPhotos by remember { mutableStateOf(false) }

    fun getImageExtension(uri: Uri): String {
        val mimeType = context.contentResolver.getType(uri)
        return when (mimeType) {
            "image/png" -> "png"
            "image/webp" -> "webp"
            "image/jpeg" -> "jpg"
            else -> "jpg"
        }
    }

    fun readBytesFromUri(uri: Uri): ByteArray? {
        return try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                input.readBytes()
            }
        } catch (_: Exception) {
            null
        }
    }

    suspend fun uploadItemPhoto(itemId: String, uri: Uri): String {
        val bytes = readBytesFromUri(uri) ?: throw Exception("Failed to read image")
        val ext = getImageExtension(uri)
        val path = "items/$itemId/${UUID.randomUUID()}.$ext"
        SupabaseClient.client.storage.from("item-photos").upload(path, bytes, upsert = false)
        return SupabaseClient.client.storage.from("item-photos").publicUrl(path)
    }

    fun isRemoteUrl(value: String): Boolean {
        return value.startsWith("http://") || value.startsWith("https://")
    }

    fun addPhoto(url: String) {
        if (photoUrls.size >= 5) {
            uploadError = "Maximum of 5 photos reached"
            return
        }
        photoUrls.add(url)
    }
    
    // Create a temporary file for camera photo
    fun createImageFile(): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile("JPEG_${timeStamp}_", ".jpg", storageDir)
    }
    
    // Image picker launcher
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            selectedImageUri = it
            addPhoto(it.toString())
        }
    }
    
    // Camera launcher with proper URI handling
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && tempPhotoUri != null) {
            selectedImageUri = tempPhotoUri
            addPhoto(tempPhotoUri.toString())
        }
    }
    
    // Permission launcher for camera
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
                tempPhotoUri?.let { uri ->
                    cameraLauncher.launch(uri)
                }
            } catch (e: Exception) {
                showCameraError = true
            }
        } else {
            showCameraError = true
        }
    }
    
    // Function to launch camera safely
    fun launchCamera() {
        if (photoUrls.size >= 5) {
            uploadError = "Maximum of 5 photos reached"
            return
        }
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
                    tempPhotoUri?.let { uri ->
                        cameraLauncher.launch(uri)
                    }
                }
                else -> {
                    cameraPermissionLauncher.launch(permission)
                }
            }
        } catch (e: Exception) {
            showCameraError = true
        }
    }

    LaunchedEffect(showDialog, existingItem?.id) {
        if (!showDialog) return@LaunchedEffect
        photoUrls.clear()
        if (existingItem?.id == null) return@LaunchedEffect
        isLoadingPhotos = true
        try {
            val rows = SupabaseClient.client
                .from("item_photos")
                .select {
                    filter { eq("item_id", existingItem.id) }
                }
                .decodeList<ItemPhoto>()
                .sortedWith(compareBy<ItemPhoto> { it.position }.thenBy { it.createdAt ?: "" })
            if (rows.isNotEmpty()) {
                photoUrls.addAll(rows.map { it.url }.take(5))
            } else if (!existingItem.photoUrl.isNullOrBlank()) {
                existingItem.photoUrl?.let { photoUrls.add(it) }
            }
        } catch (_: Exception) {
            if (!existingItem?.photoUrl.isNullOrBlank()) {
                existingItem.photoUrl?.let { photoUrls.add(it) }
            }
        } finally {
            isLoadingPhotos = false
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
                
                // Camera error message
                if (showCameraError) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp),
                        colors = CardDefaults.cardColors(containerColor = NdomogColors.ErrorBackground),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Filled.Warning,
                                contentDescription = null,
                                tint = NdomogColors.Error,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "Camera not available. Please use upload instead.",
                                color = NdomogColors.ErrorText,
                                style = MaterialTheme.typography.bodySmall
                            )
                            Spacer(modifier = Modifier.weight(1f))
                            IconButton(
                                onClick = { showCameraError = false },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    Icons.Filled.Close,
                                    contentDescription = "Dismiss",
                                    tint = NdomogColors.ErrorText,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }
                }
                
                if (uploadError != null) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp),
                        colors = CardDefaults.cardColors(containerColor = NdomogColors.ErrorBackground),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Filled.Warning,
                                contentDescription = null,
                                tint = NdomogColors.Error,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                uploadError ?: "Failed to upload image",
                                color = NdomogColors.ErrorText,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }

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
                            Divider(color = NdomogColors.DarkBorder)
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

                // Photos (optional)
                Text(
                    "Photos (optional) - up to 5",
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = NdomogColors.TextMuted,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier = Modifier.padding(bottom = 6.dp)
                )
                if (isLoadingPhotos) {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth(),
                        color = NdomogColors.Primary,
                        trackColor = NdomogColors.DarkCard
                    )
                }

                if (photoUrls.isNotEmpty()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        photoUrls.forEachIndexed { index, url ->
                            Box(
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(NdomogColors.DarkSecondary)
                            ) {
                                AsyncImage(
                                    model = url,
                                    contentDescription = "Item photo ${index + 1}",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop
                                )
                                IconButton(
                                    onClick = { photoUrls.removeAt(index) },
                                    modifier = Modifier
                                        .align(Alignment.TopEnd)
                                        .padding(2.dp)
                                        .size(24.dp)
                                        .background(NdomogColors.Error, RoundedCornerShape(4.dp))
                                ) {
                                    Icon(
                                        Icons.Filled.Close,
                                        contentDescription = "Remove",
                                        tint = NdomogColors.TextLight,
                                        modifier = Modifier.size(12.dp)
                                    )
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                }

                if (photoUrls.size < 5) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Upload button
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .height(72.dp)
                                .clickable {
                                    if (photoUrls.size >= 5) {
                                        uploadError = "Maximum of 5 photos reached"
                                    } else {
                                        imagePickerLauncher.launch("image/*")
                                    }
                                },
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
                                    "Upload (${photoUrls.size}/5)",
                                    color = NdomogColors.TextMuted,
                                    fontSize = 12.sp
                                )
                            }
                        }

                        // Camera button - using safe launch
                        Surface(
                            modifier = Modifier
                                .weight(1f)
                                .height(72.dp)
                                .clickable { launchCamera() },
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
                } else {
                    Text(
                        "Maximum of 5 photos reached",
                        color = NdomogColors.TextMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                
                Spacer(modifier = Modifier.height(16.dp))

                // Pricing Row with KES
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Buying Price
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Buying Price",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color = NdomogColors.TextMuted,
                                fontWeight = FontWeight.Medium
                            ),
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                        OutlinedTextField(
                            value = buyingPrice,
                            onValueChange = { buyingPrice = it.filter { c -> c.isDigit() || c == '.' } },
                            leadingIcon = {
                                Text(
                                    "KES",
                                    color = NdomogColors.TextMuted,
                                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium)
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = dialogTextFieldColors(),
                            shape = RoundedCornerShape(8.dp),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                        )
                    }
                    
                    // Selling Price
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Selling Price",
                            style = MaterialTheme.typography.labelMedium.copy(
                                color = NdomogColors.TextMuted,
                                fontWeight = FontWeight.Medium
                            ),
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                        OutlinedTextField(
                            value = sellingPrice,
                            onValueChange = { sellingPrice = it.filter { c -> c.isDigit() || c == '.' } },
                            leadingIcon = {
                                Text(
                                    "KES",
                                    color = NdomogColors.TextMuted,
                                    style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium)
                                )
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = dialogTextFieldColors(),
                            shape = RoundedCornerShape(8.dp),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))

                // Quantity Row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Quantity
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
                            onValueChange = { quantity = it.filter { c -> c.isDigit() } },
                            modifier = Modifier.fillMaxWidth(),
                            colors = dialogTextFieldColors(),
                            shape = RoundedCornerShape(8.dp),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                        )
                    }
                    
                    // Low Stock Threshold
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
                            onValueChange = { lowStockThreshold = it.filter { c -> c.isDigit() } },
                            modifier = Modifier.fillMaxWidth(),
                            colors = dialogTextFieldColors(),
                            shape = RoundedCornerShape(8.dp),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
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
                        ),
                        border = androidx.compose.foundation.BorderStroke(1.dp, NdomogColors.DarkBorder)
                    ) {
                        Text("Cancel")
                    }
                    
                    Button(
                        onClick = {
                            if (isUploading) return@Button
                            uploadError = null
                            val finalCategory = if (isNewCategory) newCategoryName else category
                            val itemId = existingItem?.id ?: UUID.randomUUID().toString()
                            scope.launch {
                                isUploading = true
                                val requestedPhotos = photoUrls.take(5)
                                val uploadedUrls = mutableListOf<String>()
                                for (entry in requestedPhotos) {
                                    if (isRemoteUrl(entry)) {
                                        uploadedUrls.add(entry)
                                        continue
                                    }
                                    val uri = runCatching { Uri.parse(entry) }.getOrNull()
                                    if (uri == null) continue
                                    try {
                                        val uploaded = uploadItemPhoto(itemId, uri)
                                        uploadedUrls.add(uploaded)
                                    } catch (e: Exception) {
                                        uploadError = e.message ?: "Failed to upload image"
                                        isUploading = false
                                        return@launch
                                    }
                                }
                                val finalPhotoUrl: String? = uploadedUrls.firstOrNull()
                                // Replace photos for this item
                                try {
                                    SupabaseClient.client.from("item_photos").delete {
                                        filter { eq("item_id", itemId) }
                                    }
                                    if (uploadedUrls.isNotEmpty()) {
                                        val inserts = uploadedUrls.mapIndexed { index, url ->
                                            ItemPhotoInsert(itemId = itemId, url = url, position = index)
                                        }
                                        SupabaseClient.client.from("item_photos").insert(inserts)
                                    }
                                } catch (e: Exception) {
                                    uploadError = e.message ?: "Failed to save photos"
                                    isUploading = false
                                    return@launch
                                }
                                val newItem = Item(
                                    id = itemId,
                                    name = name.trim(),
                                    category = finalCategory.trim(),
                                    details = details.trim().ifEmpty { null },
                                    photoUrl = finalPhotoUrl,
                                    buyingPrice = buyingPrice.toDoubleOrNull() ?: 0.0,
                                    sellingPrice = sellingPrice.toDoubleOrNull() ?: 0.0,
                                    quantity = quantity.toIntOrNull() ?: 0,
                                    lowStockThreshold = lowStockThreshold.toIntOrNull() ?: 5
                                )
                                isUploading = false
                                onConfirm(newItem)
                            }
                        },
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = NdomogColors.Primary
                        ),
                        shape = RoundedCornerShape(8.dp),
                        enabled = name.isNotBlank() && (category.isNotBlank() || (isNewCategory && newCategoryName.isNotBlank())) && !isUploading
                    ) {
                        if (isUploading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = NdomogColors.TextOnPrimary,
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
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
    unfocusedBorderColor = NdomogColors.DarkBorder,
    focusedBorderColor = NdomogColors.Primary,
    unfocusedContainerColor = NdomogColors.DarkSecondary.copy(alpha = 0.5f),
    focusedContainerColor = NdomogColors.DarkSecondary.copy(alpha = 0.5f),
    unfocusedTextColor = NdomogColors.TextLight,
    focusedTextColor = NdomogColors.TextLight,
    cursorColor = NdomogColors.Primary
)
