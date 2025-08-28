import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image, X } from 'lucide-react';

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileContent: string;
  fileType: string;
}

export function DocumentViewer({ 
  open, 
  onOpenChange, 
  fileName, 
  fileContent, 
  fileType 
}: DocumentViewerProps) {
  const isImage = fileType.startsWith('image/');
  const isPDF = fileType === 'application/pdf';

  const downloadFile = () => {
    const link = document.createElement('a');
    link.href = fileContent;
    link.download = fileName;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImage ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            {fileName}
          </DialogTitle>
          <DialogDescription>
            File Type: {fileType}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Size: {Math.round((fileContent.length * 3) / 4 / 1024)} KB
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={downloadFile}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>

          {/* File Preview */}
          <div className="border rounded-lg overflow-hidden bg-muted/30">
            {isImage ? (
              <div className="p-4 text-center">
                <img 
                  src={fileContent} 
                  alt={fileName}
                  className="max-w-full max-h-[60vh] object-contain mx-auto rounded"
                />
              </div>
            ) : isPDF ? (
              <div className="p-8 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">PDF Preview</p>
                <iframe
                  src={fileContent}
                  className="w-full h-96 border rounded"
                  title={fileName}
                />
              </div>
            ) : (
              <div className="p-8 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Preview not available for this file type
                </p>
                <p className="text-sm text-muted-foreground">
                  Click download to view the file
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}