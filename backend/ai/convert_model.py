"""
Convert Keras model to TensorFlow.js format for browser execution
Run this script once to convert the model
"""
import tensorflowjs as tfjs

model_path = "wlasl_lstm_model_weighted.h5"
output_path = "../../frontend/public/models/tfjs_model"

print(f"Converting {model_path} to TensorFlow.js format...")
tfjs.converters.save_keras_model(model_path, output_path)
print(f"✓ Model converted successfully to {output_path}")
print("Files created:")
print("  - model.json")
print("  - group1-shard1of1.bin (or similar)")
