import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Loader2, Download, Eye, FileText, Code, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ScrapeResult {
  success: boolean;
  url: string;
  title: string;
  description: string;
  content: {
    markdown: string;
    html: string;
    text: string;
  };
  metadata: {
    title?: string;
    description?: string;
    ogImage?: string;
    scrapedAt: string;
    sourceUrl: string;
  };
  links: string[];
  images: string[];
}

interface WebScraperProps {
  onDataExtracted?: (data: ScrapeResult) => void;
  suggestedUrls?: string[];
}

const WebScraper: React.FC<WebScraperProps> = ({ onDataExtracted, suggestedUrls = [] }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleScrape = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setError('');
    setIsLoading(true);
    setScrapeResult(null);
    
    try {
      console.log('Starting scrape for:', url);
      
      const { data, error: supabaseError } = await supabase.functions.invoke('firecrawl-scrape', {
        body: { 
          url: url.trim(),
          options: {
            formats: ['markdown', 'html'],
            excludeTags: ['nav', 'footer', 'header', 'script', 'style', 'aside'],
            onlyMainContent: true,
            timeout: 30000
          }
        }
      });

      if (supabaseError) {
        console.error('Supabase function error:', supabaseError);
        throw new Error(`Scraping Error: ${supabaseError.message}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to scrape website');
      }

      console.log('Scrape successful:', data);
      setScrapeResult(data);
      
      // Call the callback if provided
      if (onDataExtracted) {
        onDataExtracted(data);
      }

      toast({
        title: "Scraping Complete",
        description: `Successfully scraped "${data.title || url}"`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scrape website';
      setError(errorMessage);
      toast({
        title: "Scraping Failed", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedUrl = (suggestedUrl: string) => {
    setUrl(suggestedUrl);
  };

  const downloadContent = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Web Scraper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Suggested URLs */}
          {suggestedUrls.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Suggested URLs:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedUrls.map((suggestedUrl, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestedUrl(suggestedUrl)}
                    className="text-xs"
                  >
                    {new URL(suggestedUrl).hostname}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* URL Input */}
          <div className="space-y-2">
            <Input
              type="url"
              placeholder="Enter website URL to scrape..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className={error ? 'border-danger' : ''}
            />
            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}
          </div>
          
          <Button 
            onClick={handleScrape}
            disabled={isLoading || !url.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" />
                Scrape Website
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Scrape Results */}
      {scrapeResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Scraped Content
              </div>
              <Badge variant="default">Success</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Metadata */}
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Title</p>
                  <p className="text-sm text-muted-foreground">{scrapeResult.title || 'No title'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Source</p>
                  <a 
                    href={scrapeResult.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Link className="w-3 h-3" />
                    {new URL(scrapeResult.url).hostname}
                  </a>
                </div>
                {scrapeResult.description && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium">Description</p>
                    <p className="text-sm text-muted-foreground">{scrapeResult.description}</p>
                  </div>
                )}
              </div>

              {/* Content Tabs */}
              <Tabs defaultValue="markdown" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="markdown">
                    <FileText className="w-4 h-4 mr-2" />
                    Markdown
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    <FileText className="w-4 h-4 mr-2" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="html">
                    <Code className="w-4 h-4 mr-2" />
                    HTML
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="markdown" className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Markdown Content</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadContent(scrapeResult.content.markdown, 'scraped-content.md')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <Textarea
                    value={scrapeResult.content.markdown}
                    readOnly
                    className="min-h-[300px] font-mono text-sm"
                  />
                </TabsContent>

                <TabsContent value="text" className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Plain Text Content</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadContent(scrapeResult.content.text, 'scraped-content.txt')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <Textarea
                    value={scrapeResult.content.text}
                    readOnly
                    className="min-h-[300px]"
                  />
                </TabsContent>

                <TabsContent value="html" className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">HTML Content</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadContent(scrapeResult.content.html, 'scraped-content.html')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <Textarea
                    value={scrapeResult.content.html}
                    readOnly
                    className="min-h-[300px] font-mono text-sm"
                  />
                </TabsContent>
              </Tabs>

              {/* Links and Images */}
              {(scrapeResult.links.length > 0 || scrapeResult.images.length > 0) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {scrapeResult.links.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Found Links ({scrapeResult.links.length})</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {scrapeResult.links.slice(0, 10).map((link, index) => (
                          <a
                            key={index}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline block truncate"
                          >
                            {link}
                          </a>
                        ))}
                        {scrapeResult.links.length > 10 && (
                          <p className="text-xs text-muted-foreground">
                            ...and {scrapeResult.links.length - 10} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {scrapeResult.images.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Found Images ({scrapeResult.images.length})</p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {scrapeResult.images.slice(0, 5).map((image, index) => (
                          <a
                            key={index}
                            href={image}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline block truncate"
                          >
                            {image}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WebScraper;