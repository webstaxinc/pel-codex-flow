import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Building, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Request,
  CompanyCodeDetails,
  saveRequest,
  saveCompanyCodeDetails,
  saveHistoryLog,
  generateRequestId,
  getLatestRequestDetails
} from '@/lib/storage';
import { compareObjects, formatChangesForNotification, generateChangesSummary } from '@/lib/changeTracking';

interface CompanyCodeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  existingRequest?: Request;
  isChangeRequest?: boolean;
  onSuccess: () => void;
}

export function CompanyCodeForm({ 
  open, 
  onOpenChange, 
  userEmail, 
  existingRequest,
  isChangeRequest = false,
  onSuccess 
}: CompanyCodeFormProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [originalData, setOriginalData] = useState<CompanyCodeDetails | null>(null);
  const { toast } = useToast();
  
  // Form data
  const [formData, setFormData] = useState({
    companyCode: '',
    nameOfCompanyCode: '',
    shareholdingPercentage: '',
    gstCertificate: '',
    cin: '',
    pan: '',
    segment: '',
    nameOfSegment: ''
  });

  useEffect(() => {
    if (existingRequest && open) {
      loadExistingData();
    } else if (open) {
      resetForm();
    }
  }, [existingRequest, open]);

  const loadExistingData = async () => {
    if (!existingRequest) return;
    
    try {
      const details = await getLatestRequestDetails((existingRequest as any).requestId || (existingRequest as any).id, 'company') as CompanyCodeDetails;
      if (details) {
        setFormData({
          companyCode: details.companyCode || '',
          nameOfCompanyCode: details.nameOfCompanyCode || '',
          shareholdingPercentage: details.shareholdingPercentage?.toString() || '',
          gstCertificate: details.gstCertificate || '',
          cin: details.cin || '',
          pan: details.pan || '',
          segment: details.segment || '',
          nameOfSegment: details.nameOfSegment || ''
        });
        setOriginalData(details);
      } else if (isChangeRequest && (existingRequest as any).details) {
        // Load from the request details if available
        const details = (existingRequest as any).details;
        setFormData({
          companyCode: details.companyCode || '',
          nameOfCompanyCode: details.nameOfCompanyCode || '',
          shareholdingPercentage: details.shareholdingPercentage?.toString() || '',
          gstCertificate: details.gstCertificate || '',
          cin: details.cin || '',
          pan: details.pan || '',
          segment: details.segment || '',
          nameOfSegment: details.nameOfSegment || ''
        });
        setOriginalData(details);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      companyCode: '',
      nameOfCompanyCode: '',
      shareholdingPercentage: '',
      gstCertificate: '',
      cin: '',
      pan: '',
      segment: '',
      nameOfSegment: ''
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (field: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          handleInputChange(field, `${file.name} (uploaded)`);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const validateForm = () => {
    const requiredFields = Object.keys(formData);
    const emptyFields = requiredFields.filter(field => !formData[field as keyof typeof formData].toString().trim());
    
    if (emptyFields.length > 0) {
      toast({
        title: "Validation Error",
        description: "All fields are mandatory. Please fill in all required information.",
        variant: "destructive"
      });
      return false;
    }

    // Check shareholding percentage
    const percentage = parseFloat(formData.shareholdingPercentage);
    if (isNaN(percentage) || percentage < 51) {
      toast({
        title: "Validation Error",
        description: "PEL must hold at least 51% shareholding percentage.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if ((existingRequest || isChangeRequest) && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();
      let requestId = (existingRequest as any)?.requestId || (existingRequest as any)?.id || generateRequestId();
      
      // For change requests, generate a new request ID
      if (isChangeRequest) {
        requestId = generateRequestId();
      }
      
      const request: Request = {
        requestId,
        type: 'company',
        title: isChangeRequest 
          ? `Change Request - Company Code: ${formData.companyCode} - ${formData.nameOfCompanyCode}`
          : `Company Code: ${formData.companyCode} - ${formData.nameOfCompanyCode}`,
        status: 'pending-secretary',
        createdBy: userEmail,
        createdAt: isChangeRequest ? now : (existingRequest?.createdAt || now),
        updatedAt: now,
        version: isChangeRequest ? 1 : ((existingRequest?.version || 0) + 1)
      };

      const details: CompanyCodeDetails = {
        requestId,
        companyCode: formData.companyCode,
        nameOfCompanyCode: formData.nameOfCompanyCode,
        shareholdingPercentage: parseFloat(formData.shareholdingPercentage),
        gstCertificate: formData.gstCertificate,
        cin: formData.cin,
        pan: formData.pan,
        segment: formData.segment,
        nameOfSegment: formData.nameOfSegment,
        version: request.version
      };

      await saveRequest(request);
      await saveCompanyCodeDetails(details);
      
      // Track changes if this is a change request
      let changesSummary = '';
      if (isChangeRequest && originalData) {
        const comparison = compareObjects(originalData, formData, 'company');
        changesSummary = formatChangesForNotification(comparison.changes);
        
        await saveHistoryLog({
          requestId,
          action: 'create',
          user: userEmail,
          timestamp: now,
          metadata: { 
            type: 'company', 
            title: request.title,
            isChangeRequest: true,
            originalRequestId: (existingRequest as any)?.requestId || (existingRequest as any)?.id,
            changes: comparison.changes,
            changesSummary
          }
        });
      } else {
        await saveHistoryLog({
          requestId,
          action: existingRequest ? 'edit' : 'create',
          user: userEmail,
          timestamp: now,
          metadata: { type: 'company', title: request.title }
        });
      }

      toast({
        title: isChangeRequest ? "Change Request Created" : (existingRequest ? "Request Updated" : "Request Created"),
        description: isChangeRequest 
          ? `Change request created successfully. Changes: ${changesSummary}`
          : (existingRequest 
            ? "Your company code request has been updated successfully"
            : "Your company code request has been created and submitted for approval"),
        variant: "default"
      });

      onSuccess();
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isChangeRequest 
              ? 'Create Change Request - Company Code' 
              : (existingRequest ? 'Edit Company Code Request' : 'Create Company Code Request')
            }
          </DialogTitle>
          <DialogDescription>
            {isChangeRequest
              ? 'Create a change request for this existing company code. Changes will go through the full approval process.'
              : (existingRequest 
                ? 'Update your company code creation request details' 
                : 'Fill in all required information for company code creation')
            }
          </DialogDescription>
        </DialogHeader>

        {showConfirmation && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {isChangeRequest 
                ? "Are you sure you want to create this change request? It will go through the full approval process."
                : "Are you sure you want to confirm these changes? This will create a new version of your request."
              }
              {isChangeRequest && originalData && (() => {
                const comparison = compareObjects(originalData, formData, 'company');
                if (comparison.hasChanges) {
                  return (
                    <div className="mt-2">
                      <p className="font-medium">Changes detected:</p>
                      <div className="text-sm bg-muted p-2 rounded mt-1">
                        {generateChangesSummary(comparison.changes)}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </AlertDescription>
            <div className="flex space-x-2 mt-3">
              <Button size="sm" onClick={handleSubmit} disabled={loading}>
                {isChangeRequest ? 'Create Change Request' : 'Yes, Confirm Changes'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowConfirmation(false)}>
                Cancel
              </Button>
            </div>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-primary" />
              <span>Company Code Details</span>
            </CardTitle>
            <CardDescription>
              Expected completion time: 10 days after data received. All fields are mandatory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyCode">Company Code *</Label>
                <Input
                  id="companyCode"
                  value={formData.companyCode}
                  onChange={(e) => handleInputChange('companyCode', e.target.value)}
                  placeholder="Enter company code"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameOfCompanyCode">Name of Company Code *</Label>
                <Input
                  id="nameOfCompanyCode"
                  value={formData.nameOfCompanyCode}
                  onChange={(e) => handleInputChange('nameOfCompanyCode', e.target.value)}
                  placeholder="Enter company code name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shareholdingPercentage">Shareholding Percentage (%) *</Label>
                <Input
                  id="shareholdingPercentage"
                  type="number"
                  min="51"
                  max="100"
                  value={formData.shareholdingPercentage}
                  onChange={(e) => handleInputChange('shareholdingPercentage', e.target.value)}
                  placeholder="Min 51% required"
                />
                <p className="text-sm text-muted-foreground">PEL must hold at least 51%</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="segment">Segment *</Label>
                <Input
                  id="segment"
                  value={formData.segment}
                  onChange={(e) => handleInputChange('segment', e.target.value)}
                  placeholder="Enter segment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameOfSegment">Name of Segment *</Label>
                <Input
                  id="nameOfSegment"
                  value={formData.nameOfSegment}
                  onChange={(e) => handleInputChange('nameOfSegment', e.target.value)}
                  placeholder="Enter segment name"
                />
              </div>

              <div className="space-y-2">
                <Label>GST Certificate *</Label>
                <Button
                  variant="outline"
                  onClick={() => handleFileUpload('gstCertificate')}
                  className="w-full justify-start"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {formData.gstCertificate || 'Upload GST Certificate'}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>CIN *</Label>
                <Button
                  variant="outline"
                  onClick={() => handleFileUpload('cin')}
                  className="w-full justify-start"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {formData.cin || 'Upload CIN'}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>PAN *</Label>
                <Button
                  variant="outline"
                  onClick={() => handleFileUpload('pan')}
                  className="w-full justify-start"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {formData.pan || 'Upload PAN'}
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Important Notes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• A new company code can only be created if PEL Group holds ≥ 51% Stake in the company</li>
                <li>• The company code creation will take 10 days from the receipt of an approved request</li>
                <li>• All fields are mandatory</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading 
                  ? (existingRequest ? 'Updating...' : 'Creating...') 
                  : (existingRequest ? 'Update Request' : 'Create Request')
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}