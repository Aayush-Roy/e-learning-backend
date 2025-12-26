// const cloudinary = require('../config/cloudinary');
// const ApiError = require('../utils/ApiError');

// const uploadToCloudinary = async (file, options = {}) => {
//   try {
//     if (!file) {
//       throw ApiError.badRequest('No file provided');
//     }

//     const uploadOptions = {
//       folder: 'udemy-clone',
//       resource_type: 'auto',
//       ...options
//     };

//     const result = await cloudinary.uploader.upload(file, uploadOptions);
    
//     return {
//       url: result.secure_url,
//       publicId: result.public_id,
//       format: result.format,
//       resourceType: result.resource_type,
//       size: result.bytes
//     };
//   } catch (error) {
//     console.error('Cloudinary upload error:', error);
//     throw ApiError.internal('Error uploading file to cloud storage');
//   }
// };

// const uploadVideo = async (videoFile) => {
//   return uploadToCloudinary(videoFile, {
//     resource_type: 'video',
//     chunk_size: 6000000, // 6MB chunks for large videos
//     eager: [
//       { width: 300, height: 300, crop: "pad", audio_codec: "none" },
//       { width: 160, height: 100, crop: "crop", gravity: "south", audio_codec: "none" }
//     ],
//     eager_async: true
//   });
// };

// const uploadImage = async (imageFile) => {
//   return uploadToCloudinary(imageFile, {
//     resource_type: 'image',
//     transformation: [
//       { width: 800, height: 450, crop: 'limit', quality: 'auto' }
//     ]
//   });
// };

// const deleteFromCloudinary = async (publicId) => {
//   try {
//     await cloudinary.uploader.destroy(publicId);
//   } catch (error) {
//     console.error('Cloudinary delete error:', error);
//     throw ApiError.internal('Error deleting file from cloud storage');
//   }
// };

// module.exports = {
//   uploadToCloudinary,
//   uploadVideo,
//   uploadImage,
//   deleteFromCloudinary
// };
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

const uploadToCloudinary = async (fileBuffer, fileType, options = {}) => {
  try {
    if (!fileBuffer) {
      throw ApiError.badRequest('No file provided');
    }

    const uploadOptions = {
      folder: 'udemy-clone',
      resource_type: fileType === 'image' ? 'image' : 'video',
      ...options
    };

    // Convert buffer to base64 string
    const base64String = `data:${fileType === 'image' ? 'image/jpeg' : 'video/mp4'};base64,${fileBuffer.toString('base64')}`;
    
    const result = await cloudinary.uploader.upload(base64String, uploadOptions);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    throw ApiError.internal('Error uploading file to cloud storage: ' + error.message);
  }
};

const uploadVideo = async (videoBuffer) => {
  return uploadToCloudinary(videoBuffer, 'video', {
    resource_type: 'video',
    chunk_size: 6000000, // 6MB chunks for large videos
    eager: [
      { width: 300, height: 300, crop: "pad", audio_codec: "none" },
      { width: 160, height: 100, crop: "crop", gravity: "south", audio_codec: "none" }
    ],
    eager_async: true
  });
};

const uploadImage = async (imageBuffer) => {
  return uploadToCloudinary(imageBuffer, 'image', {
    resource_type: 'image',
    transformation: [
      { width: 800, height: 450, crop: 'limit', quality: 'auto' }
    ]
  });
};

const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw ApiError.internal('Error deleting file from cloud storage');
  }
};

module.exports = {
  uploadToCloudinary,
  uploadVideo,
  uploadImage,
  deleteFromCloudinary
};