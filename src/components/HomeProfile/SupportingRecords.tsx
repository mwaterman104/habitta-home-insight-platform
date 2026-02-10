import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, MoreVertical } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  type: 'deed' | 'permit' | 'warranty' | 'manual' | 'other';
}

interface SupportingRecordsProps {
  documents?: Document[];
  onUploadRecord?: () => void;
}

/**
 * SupportingRecords - Evidence documents that improve forecast accuracy
 * 
 * Renamed from "HomeDocuments" to reframe uploads as intelligence input.
 * Shows empty state when no real documents exist (no fake mock data).
 */
export const SupportingRecords: React.FC<SupportingRecordsProps> = ({ 
  documents = [],
  onUploadRecord,
}) => {
  const hasDocuments = documents.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="heading-h3">Supporting records</CardTitle>
          <p className="text-meta text-muted-foreground">
            Uploading records improves forecast accuracy and long-term clarity.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {hasDocuments ? (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div 
                key={doc.id} 
                className="flex items-center justify-between p-3 border border-border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-medium">{doc.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {doc.size} • Uploaded {doc.uploadDate}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <div className="pt-4 border-t border-border">
              <Button variant="outline" className="w-full" onClick={onUploadRecord}>
                <Upload className="h-4 w-4 mr-2" />
                Upload document
              </Button>
            </div>
          </div>
        ) : (
          /* Empty state - no fake data */
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No records uploaded yet</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onUploadRecord}>
              <Upload className="h-4 w-4 mr-2" />
              Add your first record
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
