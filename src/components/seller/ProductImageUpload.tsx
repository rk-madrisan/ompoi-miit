import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image } from 'lucide-react';

interface ProductImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

const ProductImageUpload = ({ images, onImagesChange }: ProductImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      const newImages = [...images, data.publicUrl];
      onImagesChange(newImages);

      toast({
        title: 'Success',
        description: 'Image uploaded successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Image size should be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      uploadImage(file);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      <Label>Product Images</Label>
      
      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <img
                src={image}
                alt={`Product ${index + 1}`}
                className="w-full h-24 object-cover rounded-md border"
              />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                onClick={() => removeImage(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="image-upload"
          disabled={uploading}
        />
        <Label
          htmlFor="image-upload"
          className="cursor-pointer"
        >
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            asChild
          >
            <span>
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploading ? 'Uploading...' : 'Add Image'}
            </span>
          </Button>
        </Label>
        
        {images.length === 0 && (
          <div className="flex items-center text-muted-foreground text-sm">
            <Image className="w-4 h-4 mr-1" />
            No images uploaded
          </div>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground">
        Upload product images (max 5MB each). First image will be the main product image.
      </p>
    </div>
  );
};

export default ProductImageUpload;