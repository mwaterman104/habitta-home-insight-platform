import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { ValidationCockpitDB } from "@/lib/validation-cockpit";
import { toast } from "sonner";

interface ImportCsvDialogProps {
  onImportComplete: () => void;
  children: React.ReactNode;
}

export function ImportCsvDialog({ onImportComplete, children }: ImportCsvDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    
    // Preview first few rows
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split('\n').slice(0, 4); // Header + 3 preview rows
      const preview = lines.map(line => line.split(','));
      setPreview(preview);
    };
    reader.readAsText(selectedFile);
  };

  const parseCsv = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredFields = ['street_address', 'city', 'state', 'zip'];
    
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        throw new Error(`Row ${index + 2} has incorrect number of columns`);
      }

      const row: any = {};
      headers.forEach((header, i) => {
        row[header] = values[i];
      });

      return {
        street_address: row.street_address,
        unit: row.unit || null,
        city: row.city,
        state: row.state,
        zip: row.zip,
        apn: row.apn || null,
        source_list: row.source_list || 'CSV Import',
        assigned_to: row.assigned_to || null,
        status: 'pending' as const,
      };
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const csvText = event.target?.result as string;
          const properties = parseCsv(csvText);
          
          await ValidationCockpitDB.batchCreatePropertiesSample(properties);
          
          toast.success(`Successfully imported ${properties.length} properties`);
          setOpen(false);
          setFile(null);
          setPreview([]);
          onImportComplete();
        } catch (error) {
          console.error('Import error:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to import CSV');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('File read error:', error);
      toast.error('Failed to read file');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Properties from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              Required columns: street_address, city, state, zip. Optional: unit, apn, source_list, assigned_to
            </p>
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {preview[0]?.map((header, i) => (
                          <th key={i} className="text-left p-2 font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1).map((row, i) => (
                        <tr key={i} className="border-t">
                          {row.map((cell, j) => (
                            <td key={j} className="p-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">CSV Format Requirements:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>First row must contain column headers</li>
                  <li>Required: street_address, city, state, zip</li>
                  <li>Optional: unit, apn, source_list, assigned_to</li>
                  <li>All properties will start with "pending" status</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading ? 'Importing...' : 'Import Properties'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}