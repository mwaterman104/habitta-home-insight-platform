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

interface HomeDocumentsProps {
  documents?: Document[];
}

export const HomeDocuments: React.FC<HomeDocumentsProps> = ({ 
  documents = [
    {
      id: '1',
      name: 'Property_Deed.pdf',
      size: '2.1 MB',
      uploadDate: '2023',
      type: 'deed'
    },
    {
      id: '2',
      name: 'Deck_Permit_2022.pdf',
      size: '850 KB',
      uploadDate: '2022',
      type: 'permit'
    }
  ]
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Home Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
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
          <Button variant="outline" className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};