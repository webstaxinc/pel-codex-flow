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
  getLatestRequestDetails,
  sendNotificationToAllStakeholders
} from '@/lib/storage';
import { compareObjects, formatChangesForNotification, generateChangesSummary } from '@/lib/changeTracking';
import { ConfirmationDialog } from '@/components/dialogs/ConfirmationDialog';

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
  
  // Form data - reordered fields, changed nameOfCompanyCode to Company Name
  const [formData, setFormData] = useState({
    companyCode: '',
    companyName: '', // Changed from nameOfCompanyCode
    shareholdingPercentage: '',
    cin: '', // Moved to first in upload sequence
    pan: '', // Second in upload sequence
    gstCertificate: '', // Third in upload sequence
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
          companyName: details.nameOfCompanyCode || '', // Map old field to new
          shareholdingPercentage: details.shareholdingPercentage?.toString() || '',
          cin: details.cin || '',
          pan: details.pan || '',
          gstCertificate: details.gstCertificate || '',
          segment: details.segment || '',
          nameOfSegment: details.nameOfSegment || ''
        });
        setOriginalData(details);
      } else if (isChangeRequest && (existingRequest as any).details) {
        const details = (existingRequest as any).details;
        setFormData({
          companyCode: details.companyCode || '',
          companyName: details.nameOfCompanyCode || '',
          shareholdingPercentage: details.shareholdingPercentage?.toString() || '',
          cin: details.cin || '',
          pan: details.pan || '',
          gstCertificate: details.gstCertificate || '',
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
      companyName: '',
      shareholdingPercentage: '',
      cin: '',
      pan: '',
      gstCertificate: '',
      segment: '',
      nameOfSegment: ''
    });
    setOriginalData(null);
    setShowConfirmation(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (field: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          handleInputChange(field, file.name);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const validateForm = () => {
    const requiredFields = [
      'companyCode', 'companyName', 'shareholdingPercentage', 
      'cin', 'pan', 'gstCertificate', 'segment', 'nameOfSegment'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        toast({
          title: "Validation Error",
          description: `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`,
          variant: "destructive"
        });
        return false;
      }
    }

    const percentage = parseFloat(formData.shareholdingPercentage);
    if (percentage < 51) {
      toast({
        title: "Validation Error",
        description: "PEL Group must hold at least 51% stake in the company",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleCreateClick = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const requestId = existingRequest?.requestId || generateRequestId();
      const timestamp = new Date().toISOString();

      // Map form data to database format
      const dbFormData = {
        ...formData,
        nameOfCompanyCode: formData.companyName // Map back to original field name
      };
      delete (dbFormData as any).companyName;

      if (isChangeRequest && originalData) {
        const comparison = compareObjects(originalData, dbFormData, 'company');
        
        if (!comparison.hasChanges) {
          toast({
            title: "No Changes",
            description: "No changes detected in the form data.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        // Create new change request
        const newRequestId = generateRequestId();
        const changeRequest: Request = {
          requestId: newRequestId,
          type: 'company',
          title: `Change Request - ${formData.companyCode}`,
          status: 'pending-secretary',
          createdBy: userEmail,
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1
        };

        await saveRequest(changeRequest);

        const companyDetails: CompanyCodeDetails = {
          requestId: newRequestId,
          companyCode: formData.companyCode,
          nameOfCompanyCode: formData.companyName,
          shareholdingPercentage: parseFloat(formData.shareholdingPercentage),
          cin: formData.cin,
          pan: formData.pan,
          gstCertificate: formData.gstCertificate,
          segment: formData.segment,
          nameOfSegment: formData.nameOfSegment,
          version: 1
        };

        await saveCompanyCodeDetails(companyDetails);

        await saveHistoryLog({
          requestId: newRequestId,
          action: 'create',
          user: userEmail,
          timestamp,
          metadata: { 
            isChangeRequest: true, 
            originalRequestId: requestId,
            changes: comparison.changes 
          }
        });

        const changesSummary = generateChangesSummary(comparison.changes);
        await sendNotificationToAllStakeholders(
          newRequestId,
          'change_request',
          `New Change Request for Company Code ${formData.companyCode}`,
          `${userEmail} created a change request for company code ${formData.companyCode}. Changes: ${changesSummary}`,
          userEmail
        );

        toast({
          title: "Change Request Created",
          description: "Your change request has been submitted for approval.",
        });
      } else {
        // Regular create or edit
        const request: Request = {
          requestId,
          type: 'company',
          title: `Company Code - ${formData.companyCode}`,
          status: existingRequest ? existingRequest.status : 'pending-secretary',
          createdBy: userEmail,
          createdAt: existingRequest?.createdAt || timestamp,
          updatedAt: timestamp,
          version: (existingRequest?.version || 0) + 1
        };

        await saveRequest(request);

        const companyDetails: CompanyCodeDetails = {
          requestId,
          companyCode: formData.companyCode,
          nameOfCompanyCode: formData.companyName,
          shareholdingPercentage: parseFloat(formData.shareholdingPercentage),
          cin: formData.cin,
          pan: formData.pan,
          gstCertificate: formData.gstCertificate,
          segment: formData.segment,
          nameOfSegment: formData.nameOfSegment,
          version: request.version
        };

        await saveCompanyCodeDetails(companyDetails);

        await saveHistoryLog({
          requestId,
          action: existingRequest ? 'edit' : 'create',
          user: userEmail,
          timestamp,
          metadata: { version: request.version }
        });

        if (!existingRequest) {
          await sendNotificationToAllStakeholders(
            requestId,
            'request_submitted',
            `New Company Code Request: ${formData.companyCode}`,
            `${userEmail} submitted a new company code request for ${formData.companyName}`,
            userEmail
          );
        }

        toast({
          title: existingRequest ? "Request Updated" : "Request Created",
          description: existingRequest ? "Your request has been updated successfully." : "Your company code request has been submitted for approval.",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving request:', error);
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

  const companyNotes = [
    "A new company code can only be created if PEL Group holds >= 51% Stake in the company",
    "The company code creation will take 10 days from the receipt of an approved request",
    "All fields are mandatory"
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isChangeRequest ? 'Change Request - Company Code' : 
               existingRequest ? 'Edit Company Code Request' : 'Create New Company Code Request'}
            </DialogTitle>
            <DialogDescription>
              {isChangeRequest ? 'Create a change request for the existing company code' :
               existingRequest ? 'Edit your company code request' : 'Fill in the details to create a new company code request'}
            </DialogDescription>
          </DialogHeader>

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
              {/* Company Code and Name */}
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
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
              </div>

              {/* Shareholding Percentage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shareholdingPercentage">Shareholding % *</Label>
                  <Input
                    id="shareholdingPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.shareholdingPercentage}
                    onChange={(e) => handleInputChange('shareholdingPercentage', e.target.value)}
                    placeholder="Enter shareholding percentage"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be ≥ 51% for PEL Group companies
                  </p>
                </div>
              </div>

              {/* Document Uploads - CIN, PAN, GST sequence */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CIN (Certificate of Incorporation) *</Label>
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
              </div>

              {/* Segment and Segment Name - side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="segment">Segment *</Label>
                  <Input
                    id="segment"
                    value={formData.segment}
                    onChange={(e) => handleInputChange('segment', e.target.value)}
                    placeholder="Enter segment code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nameOfSegment">Segment Name *</Label>
                  <Input
                    id="nameOfSegment"
                    value={formData.nameOfSegment}
                    onChange={(e) => handleInputChange('nameOfSegment', e.target.value)}
                    placeholder="Enter segment name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateClick} disabled={loading}>
              {isChangeRequest ? 'Create Change Request' : existingRequest ? 'Update Request' : 'Create Request'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        onConfirm={handleSubmit}
        title="Confirm Company Code Request"
        description="Please review the important information below before submitting your request."
        notes={companyNotes}
        type="company"
      />
    </>
  );
}