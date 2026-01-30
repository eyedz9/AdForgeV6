/**
 * Server Actions for Product CRUD Operations
 *
 * These server actions provide type-safe database operations for products,
 * including creation, reading, updating, and deletion with proper validation.
 * Products are associated with brands and access is controlled via RLS.
 */

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/validations/product";
import type { Product, ProductInsert, ProductUpdate, Json } from "@/lib/supabase/database.types";

// Response types for server actions
export type ActionResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export type ProductResponse = ActionResponse<Product>;
export type ProductsResponse = ActionResponse<Product[]>;
export type DeleteResponse = ActionResponse<{ id: string }>;

/**
 * Create a new product
 *
 * @param input - Product data validated against createProductSchema
 * @returns The created product or an error
 */
export async function createProduct(input: CreateProductInput): Promise<ProductResponse> {
  try {
    // Validate input
    const validationResult = createProductSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      };
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to create a product",
      };
    }

    const data = validationResult.data;

    // Verify that the brand exists and belongs to the user (RLS will also enforce this)
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .eq("id", data.brandId)
      .single();

    if (brandError || !brand) {
      return {
        success: false,
        error: "Brand not found or you don't have access to it",
      };
    }

    // Build insert data
    const insertData: ProductInsert = {
      brand_id: data.brandId,
      name: data.name,
      product_type: data.productType ?? null,
      short_description: data.shortDescription ?? null,
      full_description: data.fullDescription ?? null,
      sku: data.sku ?? null,
      price: data.price ?? null,
      price_range: data.priceRange ?? null,
      images: (data.images ?? []) as Json,
      videos: (data.videos ?? []) as Json,
      variants: (data.variants ?? []) as Json,
      marketing_attributes: (data.marketingAttributes ?? {}) as Json,
    };

    // Insert product
    const { data: product, error } = await supabase
      .from("products")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("Error creating product:", error);
      return {
        success: false,
        error: "Failed to create product. Please try again.",
      };
    }

    // Revalidate brand products page
    revalidatePath(`/brands/${data.brandId}`);
    revalidatePath(`/brands/${data.brandId}/products`);

    return {
      success: true,
      data: product as Product,
    };
  } catch (err) {
    console.error("Unexpected error in createProduct:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get a single product by ID
 *
 * @param productId - UUID of the product to retrieve
 * @returns The product or an error
 */
export async function getProduct(productId: string): Promise<ProductResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to view products",
      };
    }

    const { data: product, error } = await supabase
      .from("products")
      .select()
      .eq("id", productId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Product not found",
        };
      }
      console.error("Error fetching product:", error);
      return {
        success: false,
        error: "Failed to fetch product. Please try again.",
      };
    }

    return {
      success: true,
      data: product as Product,
    };
  } catch (err) {
    console.error("Unexpected error in getProduct:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Get all products for a specific brand
 *
 * @param brandId - UUID of the brand to get products for
 * @returns Array of products or an error
 */
export async function getProducts(brandId: string): Promise<ProductsResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to view products",
      };
    }

    const { data: products, error } = await supabase
      .from("products")
      .select()
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      return {
        success: false,
        error: "Failed to fetch products. Please try again.",
      };
    }

    return {
      success: true,
      data: (products ?? []) as Product[],
    };
  } catch (err) {
    console.error("Unexpected error in getProducts:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Update an existing product
 *
 * @param productId - UUID of the product to update
 * @param input - Product data validated against updateProductSchema
 * @returns The updated product or an error
 */
export async function updateProduct(
  productId: string,
  input: UpdateProductInput
): Promise<ProductResponse> {
  try {
    // Validate input
    const validationResult = updateProductSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors.map((e) => e.message).join(", "),
      };
    }

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to update products",
      };
    }

    const data = validationResult.data;

    // Build update object with only provided fields
    const updateData: ProductUpdate = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.productType !== undefined) updateData.product_type = data.productType;
    if (data.shortDescription !== undefined) updateData.short_description = data.shortDescription;
    if (data.fullDescription !== undefined) updateData.full_description = data.fullDescription;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.priceRange !== undefined) updateData.price_range = data.priceRange;
    if (data.images !== undefined) updateData.images = data.images as Json;
    if (data.videos !== undefined) updateData.videos = data.videos as Json;
    if (data.variants !== undefined) updateData.variants = data.variants as Json;
    if (data.marketingAttributes !== undefined) updateData.marketing_attributes = data.marketingAttributes as Json;

    // Update product
    const { data: product, error } = await supabase
      .from("products")
      .update(updateData as never)
      .eq("id", productId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return {
          success: false,
          error: "Product not found",
        };
      }
      console.error("Error updating product:", error);
      return {
        success: false,
        error: "Failed to update product. Please try again.",
      };
    }

    const typedProduct = product as Product;

    // Revalidate product pages
    revalidatePath(`/brands/${typedProduct.brand_id}`);
    revalidatePath(`/brands/${typedProduct.brand_id}/products`);
    revalidatePath(`/brands/${typedProduct.brand_id}/products/${productId}`);

    return {
      success: true,
      data: typedProduct,
    };
  } catch (err) {
    console.error("Unexpected error in updateProduct:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Delete a product
 *
 * @param productId - UUID of the product to delete
 * @returns Success status or an error
 */
export async function deleteProduct(productId: string): Promise<DeleteResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return {
        success: false,
        error: "You must be logged in to delete products",
      };
    }

    // First get the product to know the brand_id for cache revalidation
    const { data: existingProduct, error: fetchError } = await supabase
      .from("products")
      .select("brand_id")
      .eq("id", productId)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return {
          success: false,
          error: "Product not found",
        };
      }
      console.error("Error fetching product for deletion:", fetchError);
      return {
        success: false,
        error: "Failed to delete product. Please try again.",
      };
    }

    const brandId = (existingProduct as { brand_id: string }).brand_id;

    // Delete product (RLS ensures user can only delete products from their own brands)
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      console.error("Error deleting product:", error);
      return {
        success: false,
        error: "Failed to delete product. Please try again.",
      };
    }

    // Revalidate brand products page
    revalidatePath(`/brands/${brandId}`);
    revalidatePath(`/brands/${brandId}/products`);

    return {
      success: true,
      data: { id: productId },
    };
  } catch (err) {
    console.error("Unexpected error in deleteProduct:", err);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
