import React, { useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Button, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';


export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [result, setResult] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Show a placeholder while permission is being asked
  if (!permission) {
    return <View />; // Could also show a loading indicator
  }

  // If permission not granted, prompt the user
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to use the camera.</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  // Function to capture a photo and classify it
  const capturePhoto = async () => {
    if (!cameraRef.current || isProcessing) return;
    setIsProcessing(true);
    setResult("");  // reset previous result
    try {
      // Take photo with base64 encoding
      const photo = await cameraRef.current.takePictureAsync({ base64: true });
      setCapturedImage(photo.uri);
      const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (!apiKey) {
        // No API key configured
        setResult("OpenAI API key is missing. Please set EXPO_PUBLIC_OPENAI_API_KEY.");
        return;
      }
      // Prepare OpenAI API request payload with image data
      const imageDataUrl = `data:image/jpeg;base64,${photo.base64}`;
      const payload = {
        model: 'gpt-4-vision',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe this image.' },
              { type: 'image_url', image_url: { url: imageDataUrl } }
            ]
          }
        ]
      };
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      const data = await response.json();
      const description = data.choices?.[0]?.message?.content;
      setResult(description || "No description found.");
    } catch (error) {
      console.error("Error during classification:", error);
      setResult("Failed to classify image.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Allow user to retake a photo (reset state)
  const handleRetake = () => {
    setCapturedImage(null);
    setResult("");
  };

  // Render the camera preview with a capture button (if no image captured yet)
  if (!capturedImage) {
    return (
      <View style={styles.container}>
        <CameraView 
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.captureButton} onPress={capturePhoto} disabled={isProcessing}>
              <Text style={styles.captureButtonText}>
                {isProcessing ? 'Processing...' : 'Capture'}
              </Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  // Render the result screen with the captured image and classification result
  return (
    <View style={styles.resultContainer}>
      {capturedImage && (
        <Image source={{ uri: capturedImage }} style={styles.previewImage} resizeMode="contain" />
      )}
      {isProcessing ? (
        <Text style={styles.resultText}>Analyzing image...</Text>
      ) : (
        <Text style={styles.resultText}>{result}</Text>
      )}
      <Button title="Retake Photo" onPress={handleRetake} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 20
  },
  captureButton: {
    backgroundColor: '#ffffffcc',  // semi-transparent white
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8
  },
  captureButtonText: {
    fontSize: 18,
    color: '#000'
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  previewImage: {
    flex: 1,
    alignSelf: 'stretch',
    marginBottom: 20
  },
  resultText: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20
  }
});
