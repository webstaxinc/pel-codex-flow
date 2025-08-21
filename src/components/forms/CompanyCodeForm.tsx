import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Building, Info } from 'lucide-react';
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

interface CompanyCodeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  existingRequest?: Request;
  onSuccess: () => void;
}

export function CompanyCodeForm({ 
  open, 
  onOpenChange, 
  userEmail, 
  existingRequest, 
  onSuccess 
}: CompanyCodeFormProps) {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
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
    controllingArea: '',
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
    nameOfCostCenters: ''
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
      const details = await getLatestRequestDetails(existingRequest.requestId, 'company') as CompanyCodeDetails;
      if (details) {
        setFormData({
          companyCode: details.companyCode || '',
          nameOfCompanyCode: details.nameOfCompanyCode || '',
          shareholdingPercentage: details.shareholdingPercentage?.toString() || '',
          gstCertificate: details.gstCertificate || '',
          cin: details.cin || '',
          pan: details.pan || '',
          segment: details.segment || '',
          controllingArea: details.controllingArea || '',
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
          nameOfCostCenters: details.nameOfCostCenters || ''
        });
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
      controllingArea: '',
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
      nameOfCostCenters: ''
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

    if (existingRequest && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();
      let requestId = existingRequest?.requestId || generateRequestId();
      
      const request: Request = {
        requestId,
        type: 'company',
        title: `Company Code: ${formData.companyCode} - ${formData.nameOfCompanyCode}`,
        status: 'pending-secretary',
        createdBy: userEmail,
        createdAt: existingRequest?.createdAt || now,
        updatedAt: now,
        version: (existingRequest?.version || 0) + 1
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
        controllingArea: formData.controllingArea,
        plantCode: formData.plantCode,
        nameOfPlant: formData.nameOfPlant,
        addressOfPlant: formData.addressOfPlant,
        purchaseOrganization: formData.purchaseOrganization,
        nameOfPurchaseOrganization: formData.nameOfPurchaseOrganization,
        salesOrganization: formData.salesOrganization,
        nameOfSalesOrganization: formData.nameOfSalesOrganization,
        profitCenter: formData.profitCenter,
        nameOfProfitCenter: formData.nameOfProfitCenter,
        costCenters: formData.costCenters,
        nameOfCostCenters: formData.nameOfCostCenters,
        version: request.version
      };

      await saveRequest(request);
      await saveCompanyCodeDetails(details);
      
      await saveHistoryLog({
        requestId,
        action: existingRequest ? 'edit' : 'create',
        user: userEmail,
        timestamp: now,
        metadata: { type: 'company', title: request.title }
      });

      toast({
        title: existingRequest ? "Request Updated" : "Request Created",
        description: existingRequest 
          ? "Your company code request has been updated successfully"
          : "Your company code request has been created and submitted for approval",
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
            {existingRequest ? 'Edit Company Code Request' : 'Create Company Code Request'}
          </DialogTitle>
          <DialogDescription>
            {existingRequest 
              ? 'Update your company code creation request details' 
              : 'Fill in all required information for company code creation'
            }
          </DialogDescription>
        </DialogHeader>

        {showConfirmation && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Are you sure you want to confirm these changes? This will create a new version of your request.
            </AlertDescription>
            <div className="flex space-x-2 mt-3">
              <Button size="sm" onClick={handleSubmit} disabled={loading}>
                Yes, Confirm Changes
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

              <div className="space-y-2">
                <Label htmlFor="controllingArea">Controlling Area *</Label>
                <Input
                  id="controllingArea"
                  value={formData.controllingArea}
                  onChange={(e) => handleInputChange('controllingArea', e.target.value)}
                  placeholder="Enter controlling area"
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
                <Label htmlFor="nameOfPlant">Name of Plant *</Label>
                <Input
                  id="nameOfPlant"
                  value={formData.nameOfPlant}
                  onChange={(e) => handleInputChange('nameOfPlant', e.target.value)}
                  placeholder="Enter plant name"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="addressOfPlant">Address of Plant (as per GST) *</Label>
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