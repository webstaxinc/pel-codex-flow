import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Request,
  PlantCodeDetails,
  saveRequest,
  savePlantCodeDetails,
  saveHistoryLog,
  generateRequestId,
  getLatestRequestDetails,
  sendNotificationToAllStakeholders
} from '@/lib/storage';
import { compareObjects, formatChangesForNotification, generateChangesSummary } from '@/lib/changeTracking';
import { ConfirmationDialog } from '@/components/dialogs/ConfirmationDialog';

interface PlantCodeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  existingRequest?: Request;
  isChangeRequest?: boolean;
  onSuccess: () => void;
}

export function PlantCodeForm({ 
  open, 
  onOpenChange, 
  userEmail, 
  existingRequest,
  isChangeRequest = false,
  onSuccess 
}: PlantCodeFormProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [originalData, setOriginalData] = useState<PlantCodeDetails | null>(null);
  const { toast } = useToast();
  
  // Form data - reordered with plant code and name first
  const [formData, setFormData] = useState({
    plantCode: '',
    nameOfPlant: '',
    companyCode: '',
    gstCertificate: '',
    addressOfPlant: '',
    purchaseOrganization: '',
    nameOfPurchaseOrganization: '',
    salesOrganization: '',
    nameOfSalesOrganization: '',
    profitCenter: '',
    nameOfProfitCenter: '',
    costCenters: '',
    nameOfCostCenters: '',
    projectCode: '',
    projectCodeDescription: '',
    storageLocationCode: '',
    storageLocationDescription: ''
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
      const details = await getLatestRequestDetails((existingRequest as any).requestId || (existingRequest as any).id, 'plant') as PlantCodeDetails;
      if (details) {
        const formDataObj = {
          plantCode: details.plantCode || '',
          nameOfPlant: details.nameOfPlant || '',
          companyCode: details.companyCode || '',
          gstCertificate: details.gstCertificate || '',
          addressOfPlant: details.addressOfPlant || '',
          purchaseOrganization: details.purchaseOrganization || '',
          nameOfPurchaseOrganization: details.nameOfPurchaseOrganization || '',
          salesOrganization: details.salesOrganization || '',
          nameOfSalesOrganization: details.nameOfSalesOrganization || '',
          profitCenter: details.profitCenter || '',
          nameOfProfitCenter: details.nameOfProfitCenter || '',
          costCenters: details.costCenters || '',
          nameOfCostCenters: details.nameOfCostCenters || '',
          projectCode: details.projectCode || '',
          projectCodeDescription: details.projectCodeDescription || '',
          storageLocationCode: details.storageLocationCode || '',
          storageLocationDescription: details.storageLocationDescription || ''
        };
        setFormData(formDataObj);
        setOriginalData(details);
      } else if (isChangeRequest && (existingRequest as any).details) {
        const details = (existingRequest as any).details;
        setFormData({
          plantCode: details.plantCode || '',
          nameOfPlant: details.nameOfPlant || '',
          companyCode: details.companyCode || '',
          gstCertificate: details.gstCertificate || '',
          addressOfPlant: details.addressOfPlant || '',
          purchaseOrganization: details.purchaseOrganization || '',
          nameOfPurchaseOrganization: details.nameOfPurchaseOrganization || '',
          salesOrganization: details.salesOrganization || '',
          nameOfSalesOrganization: details.nameOfSalesOrganization || '',
          profitCenter: details.profitCenter || '',
          nameOfProfitCenter: details.nameOfProfitCenter || '',
          costCenters: details.costCenters || '',
          nameOfCostCenters: details.nameOfCostCenters || '',
          projectCode: details.projectCode || '',
          projectCodeDescription: details.projectCodeDescription || '',
          storageLocationCode: details.storageLocationCode || '',
          storageLocationDescription: details.storageLocationDescription || ''
        });
        setOriginalData(details);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      plantCode: '',
      nameOfPlant: '',
      companyCode: '',
      gstCertificate: '',
      addressOfPlant: '',
      purchaseOrganization: '',
      nameOfPurchaseOrganization: '',
      salesOrganization: '',
      nameOfSalesOrganization: '',
      profitCenter: '',
      nameOfProfitCenter: '',
      costCenters: '',
      nameOfCostCenters: '',
      projectCode: '',
      projectCodeDescription: '',
      storageLocationCode: '',
      storageLocationDescription: ''
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
      'plantCode', 'nameOfPlant', 'companyCode', 'gstCertificate', 'addressOfPlant',
      'purchaseOrganization', 'nameOfPurchaseOrganization', 'salesOrganization',
      'nameOfSalesOrganization', 'profitCenter', 'nameOfProfitCenter',
      'costCenters', 'nameOfCostCenters', 'projectCode', 'projectCodeDescription',
      'storageLocationCode', 'storageLocationDescription'
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

      if (isChangeRequest && originalData) {
        const comparison = compareObjects(originalData, formData, 'plant');
        
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
          type: 'plant',
          title: `Change Request - ${formData.plantCode}`,
          status: 'pending-secretary',
          createdBy: userEmail,
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1
        };

        await saveRequest(changeRequest);

        const plantDetails: PlantCodeDetails = {
          requestId: newRequestId,
          ...formData,
          version: 1
        };

        await savePlantCodeDetails(plantDetails);

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
          `New Change Request for Plant Code ${formData.plantCode}`,
          `${userEmail} created a change request for plant code ${formData.plantCode}. Changes: ${changesSummary}`,
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
          type: 'plant',
          title: `Plant Code - ${formData.plantCode}`,
          status: existingRequest ? existingRequest.status : 'pending-secretary',
          createdBy: userEmail,
          createdAt: existingRequest?.createdAt || timestamp,
          updatedAt: timestamp,
          version: (existingRequest?.version || 0) + 1
        };

        await saveRequest(request);

        const plantDetails: PlantCodeDetails = {
          requestId,
          ...formData,
          version: request.version
        };

        await savePlantCodeDetails(plantDetails);

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
            `New Plant Code Request: ${formData.plantCode}`,
            `${userEmail} submitted a new plant code request for ${formData.plantCode}`,
            userEmail
          );
        }

        toast({
          title: existingRequest ? "Request Updated" : "Request Created",
          description: existingRequest ? "Your request has been updated successfully." : "Your plant code request has been submitted for approval.",
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

  const plantNotes = [
    "The plant code creation will take 2 days from receipt of an approved request",
    "All fields are mandatory",
    "Address of the plant will be printed on the PO Print Form"
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isChangeRequest ? 'Change Request - Plant Code' : 
               existingRequest ? 'Edit Plant Code Request' : 'Create New Plant Code Request'}
            </DialogTitle>
            <DialogDescription>
              {isChangeRequest ? 'Create a change request for the existing plant code' :
               existingRequest ? 'Edit your plant code request' : 'Fill in the details to create a new plant code request'}
            </DialogDescription>
          </DialogHeader>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Plant Code Details</span>
              </CardTitle>
              <CardDescription>
                Expected completion time: 2 days after data received. All fields are mandatory.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plant Code and Name - First Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plantCode">Plant Code *</Label>
                  <Input
                    id="plantCode"
                    value={formData.plantCode}
                    onChange={(e) => handleInputChange('plantCode', e.target.value)}
                    placeholder="Enter plant code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nameOfPlant">Name of the Plant *</Label>
                  <Input
                    id="nameOfPlant"
                    value={formData.nameOfPlant}
                    onChange={(e) => handleInputChange('nameOfPlant', e.target.value)}
                    placeholder="Enter plant name"
                  />
                </div>
              </div>

              {/* Company Code and GST */}
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

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="addressOfPlant">Address of the Plant (as per GST) *</Label>
                <Textarea
                  id="addressOfPlant"
                  value={formData.addressOfPlant}
                  onChange={(e) => handleInputChange('addressOfPlant', e.target.value)}
                  placeholder="Enter plant address as per GST certificate"
                  rows={3}
                />
              </div>

              {/* Purchase Organization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseOrganization">Purchase Organization *</Label>
                  <Input
                    id="purchaseOrganization"
                    value={formData.purchaseOrganization}
                    onChange={(e) => handleInputChange('purchaseOrganization', e.target.value)}
                    placeholder="Enter purchase organization code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nameOfPurchaseOrganization">Name of the Purchase Organization *</Label>
                  <Input
                    id="nameOfPurchaseOrganization"
                    value={formData.nameOfPurchaseOrganization}
                    onChange={(e) => handleInputChange('nameOfPurchaseOrganization', e.target.value)}
                    placeholder="Enter purchase organization name"
                  />
                </div>
              </div>

              {/* Sales Organization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salesOrganization">Sales Organization *</Label>
                  <Input
                    id="salesOrganization"
                    value={formData.salesOrganization}
                    onChange={(e) => handleInputChange('salesOrganization', e.target.value)}
                    placeholder="Enter sales organization code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nameOfSalesOrganization">Name of the Sales Organization *</Label>
                  <Input
                    id="nameOfSalesOrganization"
                    value={formData.nameOfSalesOrganization}
                    onChange={(e) => handleInputChange('nameOfSalesOrganization', e.target.value)}
                    placeholder="Enter sales organization name"
                  />
                </div>
              </div>

              {/* Profit Center */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profitCenter">Profit Centre *</Label>
                  <Input
                    id="profitCenter"
                    value={formData.profitCenter}
                    onChange={(e) => handleInputChange('profitCenter', e.target.value)}
                    placeholder="Enter profit centre code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nameOfProfitCenter">Name of the Profit Center *</Label>
                  <Input
                    id="nameOfProfitCenter"
                    value={formData.nameOfProfitCenter}
                    onChange={(e) => handleInputChange('nameOfProfitCenter', e.target.value)}
                    placeholder="Enter profit center name"
                  />
                </div>
              </div>

              {/* Cost Center */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costCenters">Cost Center *</Label>
                  <Input
                    id="costCenters"
                    value={formData.costCenters}
                    onChange={(e) => handleInputChange('costCenters', e.target.value)}
                    placeholder="Enter cost center code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nameOfCostCenters">Name of the Cost Center *</Label>
                  <Input
                    id="nameOfCostCenters"
                    value={formData.nameOfCostCenters}
                    onChange={(e) => handleInputChange('nameOfCostCenters', e.target.value)}
                    placeholder="Enter cost center name"
                  />
                </div>
              </div>

              {/* Project Code */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectCode">Project Code *</Label>
                  <Input
                    id="projectCode"
                    value={formData.projectCode}
                    onChange={(e) => handleInputChange('projectCode', e.target.value)}
                    placeholder="Enter project code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectCodeDescription">Project Code Description *</Label>
                  <Input
                    id="projectCodeDescription"
                    value={formData.projectCodeDescription}
                    onChange={(e) => handleInputChange('projectCodeDescription', e.target.value)}
                    placeholder="Enter project code description"
                  />
                </div>
              </div>

              {/* Storage Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storageLocationCode">Storage Location Code *</Label>
                  <Input
                    id="storageLocationCode"
                    value={formData.storageLocationCode}
                    onChange={(e) => handleInputChange('storageLocationCode', e.target.value)}
                    placeholder="Enter storage location code"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storageLocationDescription">Storage Location Description *</Label>
                  <Input
                    id="storageLocationDescription"
                    value={formData.storageLocationDescription}
                    onChange={(e) => handleInputChange('storageLocationDescription', e.target.value)}
                    placeholder="Enter storage location description"
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
        title="Confirm Plant Code Request"
        description="Please review the important information below before submitting your request."
        notes={plantNotes}
        type="plant"
      />
    </>
  );
}