import Jimp from 'jimp';
import path from 'path';

async function generateIcons() {
  try {
    const logoPath = path.resolve('src/assets/logo.png');
    const out192 = path.resolve('public/pwa-192x192.png');
    const out512 = path.resolve('public/pwa-512x512.png');
    
    console.log('Reading original logo...');
    const image = await Jimp.read(logoPath);
    
    // Create 192x192
    console.log('Generating 192x192 icon...');
    const img192 = image.clone();
    // Use contain to fit the logo inside a 192x192 box with transparent background
    await img192.contain(192, 192).writeAsync(out192);
    
    // Create 512x512
    console.log('Generating 512x512 icon...');
    const img512 = image.clone();
    await img512.contain(512, 512).writeAsync(out512);
    
    console.log('Icons generated successfully in public/');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
