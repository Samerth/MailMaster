import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { extractTrackingInfo } from "@/lib/ocr";
import { useRecipients } from "@/hooks/useRecipients";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Upload, Wand2 } from "lucide-react";

const formSchema = z.object({
  recipientId: z.string().min(1, "Recipient is required"),
  trackingNumber: z.string().optional(),
  carrier: z.string().min(1, "Carrier is required"),
  type: z.string().min(1, "Item type is required"),
  notes: z.string().optional(),
  isPriority: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface MailIntakeFormProps {
  open: boolean;
  onClose: () => void;
  mailroomId?: number;
}

export default function MailIntakeForm({ open, onClose, mailroomId }: MailIntakeFormProps) {
  const [scanningActive, setScanningActive] = useState(false);
  const [scanningResult, setScanningResult] = useState<{ 
    success: boolean; 
    trackingNumber?: string; 
    carrier?: string;
    recipient?: string;
  } | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { recipients } = useRecipients();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipientId: "",
      trackingNumber: "",
      carrier: "ups",
      type: "package",
      notes: "",
      isPriority: false,
    },
  });
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setScanningActive(false);
      return;
    }
    
    try {
      // Read file as data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageData(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Process image with OCR
      setScanningActive(true);
      const result = await extractTrackingInfo(file);
      setScanningResult(result);
      
      // Update form values with OCR results
      if (result.trackingNumber) {
        form.setValue("trackingNumber", result.trackingNumber);
      }
      
      if (result.carrier) {
        form.setValue("carrier", result.carrier.toLowerCase());
      }
      
      if (result.recipient && recipients) {
        // Try to find recipient by name
        const fullName = result.recipient.toLowerCase();
        const matchedRecipient = recipients.find(r => 
          `${r.firstName} ${r.lastName}`.toLowerCase().includes(fullName)
        );
        
        if (matchedRecipient) {
          form.setValue("recipientId", matchedRecipient.id.toString());
        }
      }
      
      setScanningActive(false);
    } catch (error) {
      console.error("OCR error:", error);
      setScanningActive(false);
      toast({
        title: "Processing Error",
        description: "Unable to process the image. Please enter details manually.",
        variant: "destructive",
      });
    }
  };

  const activateCamera = async () => {
    setScanningActive(true);
    try {
      // Try to access the device camera
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const videoElement = document.createElement('video');
        const canvasElement = document.createElement('canvas');
        
        // Start video stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        videoElement.srcObject = stream;
        videoElement.setAttribute('playsinline', 'true'); // Required for iOS
        await videoElement.play(); // Ensure video is playing before proceeding
        
        // Create UI for camera
        const cameraUI = document.createElement('div');
        cameraUI.style.position = 'fixed';
        cameraUI.style.top = '0';
        cameraUI.style.left = '0';
        cameraUI.style.width = '100%';
        cameraUI.style.height = '100%';
        cameraUI.style.backgroundColor = 'rgba(0,0,0,0.9)';
        cameraUI.style.zIndex = '9999';
        cameraUI.style.display = 'flex';
        cameraUI.style.flexDirection = 'column';
        cameraUI.style.alignItems = 'center';
        cameraUI.style.justifyContent = 'center';
        
        // Add video element
        videoElement.style.width = '100%';
        videoElement.style.maxWidth = '500px';
        videoElement.style.borderRadius = '8px';
        cameraUI.appendChild(videoElement);
        
        // Add capture button
        const captureButton = document.createElement('button');
        captureButton.textContent = 'Take Photo';
        captureButton.style.marginTop = '20px';
        captureButton.style.padding = '10px 20px';
        captureButton.style.backgroundColor = '#2563eb';
        captureButton.style.color = 'white';
        captureButton.style.border = 'none';
        captureButton.style.borderRadius = '4px';
        captureButton.style.cursor = 'pointer';
        cameraUI.appendChild(captureButton);
        
        // Add cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.marginTop = '10px';
        cancelButton.style.padding = '10px 20px';
        cancelButton.style.backgroundColor = 'transparent';
        cancelButton.style.color = 'white';
        cancelButton.style.border = '1px solid white';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.cursor = 'pointer';
        cameraUI.appendChild(cancelButton);
        
        document.body.appendChild(cameraUI);
        
        // Create a promise to wait for user action
        const result = await new Promise<{ success: boolean, file?: File }>((resolve) => {
          // Define the cleanup function that will be used in both buttons
          const cleanup = () => {
            // Stop all video streams
            stream.getTracks().forEach(track => track.stop());
            
            // Remove the camera UI
            if (document.body.contains(cameraUI)) {
              document.body.removeChild(cameraUI);
            }
            setScanningActive(false);
          };
          
          // Set up direct onclick handlers for both buttons
          captureButton.onclick = function() {
            console.log("Capture button clicked");
            try {
              // Setup canvas with video dimensions
              canvasElement.width = videoElement.videoWidth;
              canvasElement.height = videoElement.videoHeight;
              const ctx = canvasElement.getContext('2d');
              
              if (ctx) {
                // Draw video frame to canvas
                ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
                
                // Convert canvas to data URL
                const imageDataUrl = canvasElement.toDataURL('image/jpeg');
                setImageData(imageDataUrl);
                
                // Convert data URL to Blob for OCR processing
                canvasElement.toBlob((blob) => {
                  if (blob) {
                    // Create a File object from the Blob
                    const file = new File([blob], "camera-image.jpg", { type: "image/jpeg" });
                    cleanup();
                    resolve({ success: true, file });
                  } else {
                    cleanup();
                    resolve({ success: false });
                  }
                }, 'image/jpeg', 0.9);
              } else {
                cleanup();
                resolve({ success: false });
              }
            } catch (error) {
              console.error("Error capturing image:", error);
              cleanup();
              resolve({ success: false });
            }
          };
          
          // Direct onclick handler for cancel button
          cancelButton.onclick = function() {
            console.log("Cancel button clicked");
            cleanup();
            resolve({ success: false });
          };
        });
        
        // Process the image if capture was successful
        if (result.success && result.file) {
          const ocrResult = await extractTrackingInfo(result.file);
          setScanningResult(ocrResult);
          
          // Update form values with OCR results
          if (ocrResult.trackingNumber) {
            form.setValue("trackingNumber", ocrResult.trackingNumber);
          }
          
          if (ocrResult.carrier) {
            form.setValue("carrier", ocrResult.carrier.toLowerCase());
          }
          
          if (ocrResult.recipient && recipients) {
            // Try to find recipient by name
            const fullName = ocrResult.recipient.toLowerCase();
            const matchedRecipient = recipients.find(r => 
              `${r.firstName} ${r.lastName}`.toLowerCase().includes(fullName)
            );
            
            if (matchedRecipient) {
              form.setValue("recipientId", matchedRecipient.id.toString());
            }
          }
        }
      } else {
        // Fallback to file input if camera not available
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }
    } catch (error) {
      console.error("Camera error:", error);
      setScanningActive(false);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please try uploading an image instead.",
        variant: "destructive",
      });
    }
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const data = {
        ...values,
        recipientId: parseInt(values.recipientId),
        mailRoomId: mailroomId,
        labelImage: imageData,
      };
      
      const response = await apiRequest("POST", "/api/mail-items", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Mail item recorded",
        description: "The mail item has been successfully recorded and the recipient notified.",
      });
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/mail-items/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mail-items/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mail-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities/recent'] });
      form.reset();
      setImageData(null);
      setScanningResult(null);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record mail item. Please try again.",
        variant: "destructive",
      });
      console.error("Error recording mail item:", error);
    },
  });

  const handleSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v7h-2l-1 2H8l-1-2H5V5z" clipRule="evenodd" />
            </svg>
            Mail Intake Form
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Scan/Upload Section */}
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              {imageData ? (
                <div className="space-y-2">
                  <div className="relative w-full max-h-48 overflow-hidden rounded border border-slate-200">
                    <img src={imageData} alt="Scanned label" className="mx-auto max-h-48 object-contain" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="absolute top-2 right-2 bg-white/80"
                      onClick={() => {
                        setImageData(null);
                        setScanningResult(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm text-slate-500">Scan package label or upload image</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    disabled={scanningActive}
                  />
                  <div className="flex justify-center space-x-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={activateCamera}
                      disabled={scanningActive}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Scan
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={scanningActive}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Supports JPG, PNG under 5MB</p>
                </div>
              )}
            </div>
            
            {/* OCR Results */}
            {scanningResult && (
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Wand2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">OCR Results</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      {scanningResult.trackingNumber && (
                        <p>Detected tracking number: {scanningResult.trackingNumber}</p>
                      )}
                      {scanningResult.carrier && (
                        <p>Carrier: {scanningResult.carrier}</p>
                      )}
                      {scanningResult.recipient && (
                        <p>Recipient: {scanningResult.recipient}</p>
                      )}
                      {!scanningResult.trackingNumber && !scanningResult.carrier && !scanningResult.recipient && (
                        <p>No information could be automatically extracted. Please fill in details manually.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="recipientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recipient" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {recipients?.map((recipient) => (
                          <SelectItem key={recipient.id} value={recipient.id.toString()}>
                            {recipient.firstName} {recipient.lastName} {recipient.department ? `(${recipient.department})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="trackingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tracking number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="carrier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carrier</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select carrier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ups">UPS</SelectItem>
                        <SelectItem value="fedex">FedEx</SelectItem>
                        <SelectItem value="usps">USPS</SelectItem>
                        <SelectItem value="dhl">DHL</SelectItem>
                        <SelectItem value="amazon">Amazon</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="package">Package (Standard)</SelectItem>
                        <SelectItem value="large_package">Package (Large)</SelectItem>
                        <SelectItem value="letter">Letter/Envelope</SelectItem>
                        <SelectItem value="perishable">Perishable</SelectItem>
                        <SelectItem value="signature_required">Signature Required</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter any additional details about the package" 
                        className="resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isPriority"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Mark as Priority</FormLabel>
                      <FormDescription>
                        This will highlight the item and trigger immediate notifications
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(handleSubmit)} 
            disabled={mutation.isPending || scanningActive}
          >
            {mutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              "Record & Notify"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}