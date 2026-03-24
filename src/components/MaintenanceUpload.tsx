import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileImage, X, CheckCircle } from 'lucide-react';
import { validateFileUpload } from '@/lib/validation';
import { useToast } from '@/hooks/use-toast';

interface MaintenanceUploadProps {
  onUploadComplete: (data: { applianceType: string; fileName: string }) => void;
}

const MaintenanceUpload: React.FC<MaintenanceUploadProps> = ({ onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [applianceType, setApplianceType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFileUpload(file);
    if (!validation.isValid) {
      toast({
        title: "File Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setUploadSuccess(false);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const validation = validateFileUpload(file);
      if (!validation.isValid) {
        toast({
          title: "File Error",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !applianceType) {
      toast({
        title: "Missing Information",
        description: "Please select a file and appliance type",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Simulate API call - in a real app, this would upload to your backend
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('applianceType', applianceType);

      // Mock successful upload
      await new Promise(resolve => setTimeout(resolve, 2000));

      setUploadSuccess(true);
      onUploadComplete({
        applianceType,
        fileName: selectedFile.name
      });

      toast({
        title: "Upload Successful",
        description: `${selectedFile.name} uploaded for ${applianceType}`,
      });

      // Reset form
      setSelectedFile(null);
      setApplianceType('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload maintenance photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Maintenance Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Appliance Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="appliance-type">Appliance Type</Label>
          <Select value={applianceType} onValueChange={setApplianceType}>
            <SelectTrigger>
              <SelectValue placeholder="Select appliance type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hvac">HVAC System</SelectItem>
              <SelectItem value="water-heater">Water Heater</SelectItem>
              <SelectItem value="furnace">Furnace</SelectItem>
              <SelectItem value="ac-unit">AC Unit</SelectItem>
              <SelectItem value="roof">Roof</SelectItem>
              <SelectItem value="plumbing">Plumbing</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* File Upload Area */}
        <div className="space-y-2">
          <Label>Maintenance Photo</Label>
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="space-y-2">
                <FileImage className="w-8 h-8 mx-auto text-primary" />
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {uploadSuccess && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Upload successful!</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, GIF up to 5MB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !applianceType || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-bounce" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MaintenanceUpload;