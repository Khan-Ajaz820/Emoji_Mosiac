const fs = require('fs').promises;
const path = require('path');
const { optimize } = require('svgo');

// Uldtra-aggressive but visually-safe SVGO configuration
const svgoConfig = {
  multipass: true, // Run optimizations multiple times for maximum compression
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Keep viewBox - critical for scaling
          removeViewBox: false,
          // Keep IDs if they're referenced
          cleanupIds: {
            remove: true,
            minify: true,
            preserve: [],
            preservePrefixes: [],
            force: false
          }
        }
      }
    },
    // Additional aggressive optimizations
    'removeDoctype',
    'removeXMLProcInst',
    'removeComments',
    'removeMetadata',
    'removeEditorsNSData',
    'cleanupAttrs',
    'mergeStyles',
    'inlineStyles',
    'minifyStyles',
    'cleanupIds',
    'removeUselessDefs',
    'cleanupNumericValues',
    'convertColors',
    'removeUnknownsAndDefaults',
    'removeNonInheritableGroupAttrs',
    'removeUselessStrokeAndFill',
    'removeHiddenElems',
    'removeEmptyText',
    'convertShapeToPath',
    'convertEllipseToCircle',
    'moveElemsAttrsToGroup',
    'moveGroupAttrsToElems',
    'collapseGroups',
    'convertPathData',
    'convertTransform',
    'removeEmptyAttrs',
    'removeEmptyContainers',
    'mergePaths',
    'removeUnusedNS',
    'sortDefsChildren',
    'removeTitle',
    'removeDesc',
    {
      name: 'removeAttrs',
      params: {
        attrs: '(data-.*|class)' // Remove data attributes and classes if not needed
      }
    }
  ],
  js2svg: {
    indent: 0, // No indentation
    pretty: false // Minified output
  }
};

async function getAllSvgFiles(dir) {
  const files = [];
  
  async function scan(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg')) {
        files.push(fullPath);
      }
    }
  }
  
  await scan(dir);
  return files;
}

async function optimizeSvg(filePath, outputDir) {
  try {
    const svgContent = await fs.readFile(filePath, 'utf8');
    const result = optimize(svgContent, {
      path: filePath,
      ...svgoConfig
    });
    
    // Determine output path
    const relativePath = path.relative(process.argv[2], filePath);
    const outputPath = path.join(outputDir, relativePath);
    
    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Write optimized file
    await fs.writeFile(outputPath, result.data);
    
    const originalSize = Buffer.byteLength(svgContent, 'utf8');
    const optimizedSize = Buffer.byteLength(result.data, 'utf8');
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(2);
    
    return {
      file: path.basename(filePath),
      originalSize,
      optimizedSize,
      savings: parseFloat(savings)
    };
  } catch (error) {
    console.error(`Error optimizing ${filePath}:`, error.message);
    return null;
  }
}

async function main() {
  const inputDir = process.argv[2];
  const outputDir = process.argv[3] || path.join(inputDir, '../optimized-emojis');
  
  if (!inputDir) {
    console.log('Usage: node optimize-svgs.js <input-directory> [output-directory]');
    console.log('Example: node optimize-svgs.js ./emojis ./optimized');
    process.exit(1);
  }
  
  console.log('🚀 Starting deep SVG optimization...');
  console.log(`📁 Input: ${inputDir}`);
  console.log(`📁 Output: ${outputDir}`);
  console.log('');
  
  // Get all SVG files
  const svgFiles = await getAllSvgFiles(inputDir);
  console.log(`📊 Found ${svgFiles.length} SVG files`);
  console.log('');
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  // Optimize all files
  const startTime = Date.now();
  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  let processedCount = 0;
  
  console.log('⚡ Optimizing files...');
  
  for (let i = 0; i < svgFiles.length; i++) {
    const result = await optimizeSvg(svgFiles[i], outputDir);
    
    if (result) {
      totalOriginalSize += result.originalSize;
      totalOptimizedSize += result.optimizedSize;
      processedCount++;
      
      // Progress indicator
      if ((i + 1) % 100 === 0 || i === svgFiles.length - 1) {
        const progress = ((i + 1) / svgFiles.length * 100).toFixed(1);
        process.stdout.write(`\r   Progress: ${i + 1}/${svgFiles.length} (${progress}%)`);
      }
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n');
  console.log('✅ Optimization complete!');
  console.log('');
  console.log('📈 Statistics:');
  console.log(`   Files processed: ${processedCount}`);
  console.log(`   Original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Optimized size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Total saved: ${((totalOriginalSize - totalOptimizedSize) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Reduction: ${((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(2)}%`);
  console.log(`   Time taken: ${duration} seconds`);
  console.log(`   Speed: ${(processedCount / parseFloat(duration)).toFixed(0)} files/second`);
}

main().catch(console.error);
