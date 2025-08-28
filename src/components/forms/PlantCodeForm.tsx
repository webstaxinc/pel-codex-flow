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
  getLatestRequestDetails
} from '@/lib/storage';
import { compareObjects, formatChangesForNotification, generateChangesSummary } from '@/lib/changeTracking';

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
  
  // Form data
  const [formData, setFormData] = useState({
    companyCode: '',
    gstCertificate: '',
    plantCode: '',
    nameOfPlant: '',
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
          companyCode: details.companyCode || '',
          gstCertificate: details.gstCertificate || '',
          plantCode: details.plantCode || '',
          nameOfPlant: details.nameOfPlant || '',
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
        // Load from the request details if available
        const details = (existingRequest as any).details;
        const formDataObj = {
          companyCode: details.companyCode || '',
          gstCertificate: details.gstCertificate || '',
          plantCode: details.plantCode || '',
          nameOfPlant: details.nameOfPlant || '',
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
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      companyCode: '',
      gstCertificate: '',
      plantCode: '',
      nameOfPlant: '',
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
    const emptyFields = requiredFields.filter(field => !formData[field as keyof typeof formData].trim());
    
    if (emptyFields.length > 0) {
      toast({
        title: "Validation Error",
        description: "All fields are mandatory. Please fill in all required information.",
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
        type: 'plant',
        title: isChangeRequest 
          ? `Change Request - Plant Code: ${formData.plantCode} - ${formData.nameOfPlant}`
          : `Plant Code: ${formData.plantCode} - ${formData.nameOfPlant}`,
        status: 'pending-secretary',
        createdBy: userEmail,
        createdAt: isChangeRequest ? now : (existingRequest?.createdAt || now),
        updatedAt: now,
        version: isChangeRequest ? 1 : ((existingRequest?.version || 0) + 1)
      };

      const details: PlantCodeDetails = {
        requestId,
        ...formData,
        version: request.version
      };

      await saveRequest(request);
      await savePlantCodeDetails(details);
      
      // Track changes if this is a change request
      let changesSummary = '';
      if (isChangeRequest && originalData) {
        const comparison = compareObjects(originalData, formData, 'plant');
        changesSummary = formatChangesForNotification(comparison.changes);
        
        await saveHistoryLog({
          requestId,
          action: 'create',
          user: userEmail,
          timestamp: now,
          metadata: { 
            type: 'plant', 
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
          metadata: { type: 'plant', title: request.title }
        });
      }

      toast({
        title: isChangeRequest ? "Change Request Created" : (existingRequest ? "Request Updated" : "Request Created"),
        description: isChangeRequest 
          ? `Change request created successfully. Changes: ${changesSummary}`
          : (existingRequest 
            ? "Your plant code request has been updated successfully"
            : "Your plant code request has been created and submitted for approval"),
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
              ? 'Create Change Request - Plant Code' 
              : (existingRequest ? 'Edit Plant Code Request' : 'Create Plant Code Request')
            }
          </DialogTitle>
          <DialogDescription>
            {isChangeRequest
              ? 'Create a change request for this existing plant code. Changes will go through the full approval process.'
              : (existingRequest 
                ? 'Update your plant code creation request details' 
                : 'Fill in all required information for plant code creation')
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
                const comparison = compareObjects(originalData, formData, 'plant');
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
              <FileText className="h-5 w-5 text-primary" />
              <span>Plant Code Details</span>
            </CardTitle>
            <CardDescription>
              Expected completion time: 2 days after data received. All fields are mandatory.
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
                <Label htmlFor="plantCode">Plant Code *</Label>
                <Input
                  id="plantCode"
                  value={formData.plantCode}
                  onChange={(e) => handleInputChange('plantCode', e.target.value)}
                  placeholder="Enter plant code"
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


              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nameOfPlant">Name of the Plant *</Label>
                <Input
                  id="nameOfPlant"
                  value={formData.nameOfPlant}
                  onChange={(e) => handleInputChange('nameOfPlant', e.target.value)}
                  placeholder="Enter plant name"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="addressOfPlant">Address of the Plant (as per GST) *</Label>
                <Textarea
                  id="addressOfPlant"
                  value={formData.addressOfPlant}
                  onChange={(e) => handleInputChange('addressOfPlant', e.target.value)}
                  placeholder="Enter plant address as per GST certificate"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseOrganization">Purchase Organization *</Label>
                <Input
                  id="purchaseOrganization"
                  value={formData.purchaseOrganization}
                  onChange={(e) => handleInputChange('purchaseOrganization', e.target.value)}
                  placeholder="Enter purchase organization"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameOfPurchaseOrganization">Name of Purchase Organization *</Label>
                <Input
                  id="nameOfPurchaseOrganization"
                  value={formData.nameOfPurchaseOrganization}
                  onChange={(e) => handleInputChange('nameOfPurchaseOrganization', e.target.value)}
                  placeholder="Enter purchase organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salesOrganization">Sales Organization *</Label>
                <Input
                  id="salesOrganization"
                  value={formData.salesOrganization}
                  onChange={(e) => handleInputChange('salesOrganization', e.target.value)}
                  placeholder="Enter sales organization"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameOfSalesOrganization">Name of Sales Organization *</Label>
                <Input
                  id="nameOfSalesOrganization"
                  value={formData.nameOfSalesOrganization}
                  onChange={(e) => handleInputChange('nameOfSalesOrganization', e.target.value)}
                  placeholder="Enter sales organization name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profitCenter">Profit Center *</Label>
                <Input
                  id="profitCenter"
                  value={formData.profitCenter}
                  onChange={(e) => handleInputChange('profitCenter', e.target.value)}
                  placeholder="Enter profit center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameOfProfitCenter">Name of Profit Center *</Label>
                <Input
                  id="nameOfProfitCenter"
                  value={formData.nameOfProfitCenter}
                  onChange={(e) => handleInputChange('nameOfProfitCenter', e.target.value)}
                  placeholder="Enter profit center name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="costCenters">Cost Centers *</Label>
                <Input
                  id="costCenters"
                  value={formData.costCenters}
                  onChange={(e) => handleInputChange('costCenters', e.target.value)}
                  placeholder="Enter cost centers"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameOfCostCenters">Name of Cost Centers *</Label>
                <Input
                  id="nameOfCostCenters"
                  value={formData.nameOfCostCenters}
                  onChange={(e) => handleInputChange('nameOfCostCenters', e.target.value)}
                  placeholder="Enter cost centers name"
                />
              </div>

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

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Important Notes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• The plant code creation will take 2 days from receipt of an approved request</li>
                <li>• All fields are mandatory</li>
                <li>• Address of the plant will be printed on the PO Print Form</li>
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