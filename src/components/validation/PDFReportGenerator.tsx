import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { FileDown, FileText, Building, User, Calendar } from "lucide-react";
import { PropertySample, EnrichmentSnapshot, ScoredPrediction } from "@/lib/validation-cockpit";
import { toast } from "sonner";

interface PDFReportGeneratorProps {
  property: PropertySample;
  enrichmentData: EnrichmentSnapshot[];
  predictions: ScoredPrediction[];
  children?: React.ReactNode;
}

interface ReportConfig {
  type: 'executive' | 'technical' | 'audit';
  includeProvenance: boolean;
  includeRawData: boolean;
  confidenceThreshold: number;
}

export function PDFReportGenerator({ property, enrichmentData, predictions, children }: PDFReportGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [config, setConfig] = useState<ReportConfig>({
    type: 'executive',
    includeProvenance: true,
    includeRawData: false,
    confidenceThreshold: 0.5,
  });

  const generatePDFReport = async () => {
    setGenerating(true);
    setProgress(0);

    try {
      // Simulate report generation steps
      const steps = [
        'Analyzing property data...',
        'Processing predictions...',
        'Generating executive summary...',
        'Creating confidence analysis...',
        'Formatting report...',
        'Finalizing PDF...'
      ];

      for (let i = 0; i < steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setProgress(((i + 1) / steps.length) * 100);
      }

      // Generate the actual report content
      const reportContent = generateReportContent();
      
      // Create and download PDF (using HTML to PDF simulation)
      const blob = new Blob([reportContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `property-report-${property.street_address.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Property report generated successfully!');
      setOpen(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };

  const generateReportContent = () => {
    const reportDate = new Date().toLocaleDateString();
    const reportTime = new Date().toLocaleTimeString();
    
    // Filter predictions by confidence threshold
    const filteredPredictions = predictions.filter(p => 
      (p.confidence_0_1 || 0) >= config.confidenceThreshold
    );

    // Calculate accuracy metrics
    const totalPredictions = filteredPredictions.length;
    const correctPredictions = filteredPredictions.filter(p => p.match === true).length;
    const overallAccuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions * 100) : 0;

    // Group predictions by field
    const predictionsByField = filteredPredictions.reduce((acc, pred) => {
      if (!acc[pred.field]) acc[pred.field] = [];
      acc[pred.field].push(pred);
      return acc;
    }, {} as Record<string, ScoredPrediction[]>);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Habitta Property Intelligence Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #0066cc;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 10px;
        }
        .property-address {
            font-size: 20px;
            color: #666;
            margin-bottom: 5px;
        }
        .report-info {
            font-size: 14px;
            color: #888;
        }
        .section {
            margin: 30px 0;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #0066cc;
            border-left: 4px solid #0066cc;
            padding-left: 10px;
            margin-bottom: 15px;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .metric-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #0066cc;
        }
        .metric-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        }
        .prediction-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        .prediction-table th,
        .prediction-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        .prediction-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        .confidence-high { color: #28a745; }
        .confidence-medium { color: #ffc107; }
        .confidence-low { color: #dc3545; }
        .match-correct { color: #28a745; font-weight: bold; }
        .match-incorrect { color: #dc3545; font-weight: bold; }
        .match-unknown { color: #666; }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .disclaimer {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
        }
        .data-source {
            background: #e8f4fd;
            border-left: 3px solid #0066cc;
            padding: 10px;
            margin: 10px 0;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🏠 Habitta</div>
        <div class="property-address">${property.street_address}, ${property.city}, ${property.state} ${property.zip}</div>
        <div class="report-info">
            Property Intelligence Report • Generated ${reportDate} at ${reportTime}
        </div>
    </div>

    ${config.type === 'executive' ? `
    <div class="section">
        <div class="section-title">Executive Summary</div>
        <p>This report provides AI-powered insights for the property located at ${property.street_address}. Our analysis combines data from multiple sources including permit records, property databases, and satellite imagery to predict key home system characteristics.</p>
        
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${totalPredictions}</div>
                <div class="metric-label">Total Predictions</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${overallAccuracy.toFixed(1)}%</div>
                <div class="metric-label">Accuracy Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${enrichmentData.length}</div>
                <div class="metric-label">Data Sources</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Math.round(filteredPredictions.reduce((sum, p) => sum + (p.confidence_0_1 || 0), 0) / filteredPredictions.length * 100)}%</div>
                <div class="metric-label">Avg Confidence</div>
            </div>
        </div>
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">Property Predictions</div>
        <table class="prediction-table">
            <thead>
                <tr>
                    <th>System/Feature</th>
                    <th>Predicted Value</th>
                    <th>Confidence</th>
                    ${config.type !== 'executive' ? '<th>Actual Value</th><th>Match</th>' : ''}
                    ${config.includeProvenance ? '<th>Data Source</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${Object.entries(predictionsByField).map(([field, preds]) => {
                  const pred = preds[0]; // Take first prediction for each field
                  const confidence = (pred.confidence_0_1 || 0) * 100;
                  const confidenceClass = confidence >= 80 ? 'confidence-high' : confidence >= 50 ? 'confidence-medium' : 'confidence-low';
                  
                  return `
                    <tr>
                        <td><strong>${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong></td>
                        <td>${pred.predicted_value}</td>
                        <td class="${confidenceClass}">${confidence.toFixed(0)}%</td>
                        ${config.type !== 'executive' ? `
                          <td>${pred.actual_value || 'N/A'}</td>
                          <td class="${pred.match === true ? 'match-correct' : pred.match === false ? 'match-incorrect' : 'match-unknown'}">
                            ${pred.match === true ? '✓ Correct' : pred.match === false ? '✗ Incorrect' : '? Unknown'}
                          </td>
                        ` : ''}
                        ${config.includeProvenance && pred.data_provenance ? `
                          <td class="data-source">
                            ${typeof pred.data_provenance === 'object' ? 
                              Object.entries(pred.data_provenance).map(([key, value]) => `${key}: ${value}`).join(', ') : 
                              pred.data_provenance}
                          </td>
                        ` : ''}
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
    </div>

    ${config.includeProvenance ? `
    <div class="section">
        <div class="section-title">Data Sources & Methodology</div>
        <p>This analysis incorporates data from the following sources:</p>
        ${enrichmentData.map(source => `
          <div class="data-source">
            <strong>${source.provider.charAt(0).toUpperCase() + source.provider.slice(1)} Database</strong> - 
            Retrieved on ${new Date(source.retrieved_at).toLocaleDateString()}
          </div>
        `).join('')}
        
        <p><strong>Methodology:</strong> Predictions are generated using rule-based algorithms that analyze permit records, property characteristics, and regional building practices. Confidence scores reflect the quality and recency of available data sources.</p>
    </div>
    ` : ''}

    <div class="disclaimer">
        <strong>Important Disclaimer:</strong> This report is generated by automated analysis and should be used for informational purposes only. Predictions are estimates based on available data and may not reflect actual property conditions. Professional inspection is recommended for accurate assessment of home systems and conditions.
    </div>

    <div class="footer">
        <p><strong>Habitta Property Intelligence</strong></p>
        <p>Report Configuration: ${config.type.charAt(0).toUpperCase() + config.type.slice(1)} | 
           Confidence Threshold: ${config.confidenceThreshold * 100}% | 
           Generated: ${reportDate}</p>
        <p>This report is proprietary and confidential. Distribution is restricted.</p>
    </div>
</body>
</html>
    `;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Property Report
          </DialogTitle>
        </DialogHeader>

        {!generating ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select 
                value={config.type} 
                onValueChange={(value: 'executive' | 'technical' | 'audit') => 
                  setConfig(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="executive">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <div>
                        <div>Executive Summary</div>
                        <div className="text-xs text-muted-foreground">High-level insights, minimal technical detail</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="technical">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <div>
                        <div>Technical Report</div>
                        <div className="text-xs text-muted-foreground">Detailed analysis with accuracy metrics</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="audit">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div>
                        <div>Audit Report</div>
                        <div className="text-xs text-muted-foreground">Complete data provenance and raw data</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Confidence</label>
              <Select 
                value={config.confidenceThreshold.toString()} 
                onValueChange={(value) => 
                  setConfig(prev => ({ ...prev, confidenceThreshold: parseFloat(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Predictions (0%+)</SelectItem>
                  <SelectItem value="0.3">Low Confidence (30%+)</SelectItem>
                  <SelectItem value="0.5">Medium Confidence (50%+)</SelectItem>
                  <SelectItem value="0.7">High Confidence (70%+)</SelectItem>
                  <SelectItem value="0.9">Very High Confidence (90%+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Report Preview:</p>
              <p className="text-muted-foreground">
                {predictions.filter(p => (p.confidence_0_1 || 0) >= config.confidenceThreshold).length} predictions will be included
              </p>
            </div>

            <Button onClick={generatePDFReport} className="w-full">
              Generate PDF Report
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Generating report...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mx-auto mb-2" />
              This may take a few moments
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}