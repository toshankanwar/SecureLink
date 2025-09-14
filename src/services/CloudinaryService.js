import { Cloudinary } from 'cloudinary-react-native';

class CloudinaryService {
  constructor() {
    this.cloudinary = new Cloudinary({
      cloud: {
        cloudName: 'drlxxyu9o', 
      },
      url: {
        secure: true,
      },
    });
  }

  async uploadProfilePicture(imageUri, contactId) {
    try {
      const options = {
        upload_preset: 'profile_pictures',
        public_id: `profile_${contactId}`, // Use contactId as filename
        folder: 'securelink/profile_pictures',
        resource_type: 'image',
      };

      const result = await this.cloudinary.uploader.upload(imageUri, options);
      return result.secure_url; // Return the uploaded image URL
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw error;
    }
  }

  async deleteProfilePicture(contactId) {
    try {
      const publicId = `securelink/profile_pictures/profile_${contactId}`;
      const result = await this.cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      throw error;
    }
  }

  getProfilePictureUrl(contactId, transformations = 'w_400,h_400,c_fill') {
    const publicId = `securelink/profile_pictures/profile_${contactId}`;
    return this.cloudinary.url(publicId, {
      transformation: transformations,
      secure: true,
    });
  }
}

export default new CloudinaryService();
