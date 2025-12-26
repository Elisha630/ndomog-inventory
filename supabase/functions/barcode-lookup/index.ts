/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductInfo {
  name: string;
  category?: string;
  details?: string;
  imageUrl?: string;
  brand?: string;
}

async function lookupOpenFoodFacts(barcode: string): Promise<ProductInfo | null> {
  try {
    console.log(`Looking up barcode ${barcode} on Open Food Facts...`);
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { headers: { 'User-Agent': 'Inventory App - Lovable' } }
    );
    
    if (!response.ok) {
      console.log(`Open Food Facts returned ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status !== 1 || !data.product) {
      console.log('Product not found on Open Food Facts');
      return null;
    }
    
    const product = data.product;
    console.log(`Found product: ${product.product_name}`);
    
    return {
      name: product.product_name || product.product_name_en || barcode,
      category: product.categories_tags?.[0]?.replace('en:', '') || product.categories?.split(',')[0],
      details: [
        product.brands && `Brand: ${product.brands}`,
        product.quantity && `Quantity: ${product.quantity}`,
        product.generic_name_en || product.generic_name,
      ].filter(Boolean).join('. ') || undefined,
      imageUrl: product.image_url || product.image_front_url,
      brand: product.brands,
    };
  } catch (error) {
    console.error('Open Food Facts lookup error:', error);
    return null;
  }
}

async function lookupUPCItemDB(barcode: string): Promise<ProductInfo | null> {
  try {
    console.log(`Looking up barcode ${barcode} on UPC ItemDB...`);
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
      { headers: { 'User-Agent': 'Inventory App - Lovable' } }
    );
    
    if (!response.ok) {
      console.log(`UPC ItemDB returned ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log('Product not found on UPC ItemDB');
      return null;
    }
    
    const item = data.items[0];
    console.log(`Found product: ${item.title}`);
    
    return {
      name: item.title || barcode,
      category: item.category,
      details: [
        item.brand && `Brand: ${item.brand}`,
        item.description,
      ].filter(Boolean).join('. ') || undefined,
      imageUrl: item.images?.[0],
      brand: item.brand,
    };
  } catch (error) {
    console.error('UPC ItemDB lookup error:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { barcode } = await req.json();
    
    if (!barcode) {
      return new Response(
        JSON.stringify({ error: 'Barcode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Looking up barcode: ${barcode}`);

    // Try Open Food Facts first (better for food products)
    let product = await lookupOpenFoodFacts(barcode);
    
    // If not found, try UPC ItemDB (general products)
    if (!product) {
      product = await lookupUPCItemDB(barcode);
    }

    if (!product) {
      console.log(`No product found for barcode: ${barcode}`);
      return new Response(
        JSON.stringify({ 
          found: false, 
          message: 'Product not found in database',
          barcode 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Returning product info for: ${product.name}`);
    return new Response(
      JSON.stringify({ 
        found: true, 
        product,
        barcode 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Barcode lookup error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to lookup barcode' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
