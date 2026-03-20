import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readdir, stat, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Configure route for large file uploads (100MB)
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes timeout

// Disable body size limit for this route
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

const UPLOAD_DIR = path.join(process.cwd(), 'user-uploads')

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

// Allowed file types
const ALLOWED_TYPES: Record<string, string[]> = {
  'nutrition-csv': ['.csv', '.xlsx', '.xls'],
  'toxins-pdf': ['.pdf'],
  'recipes-pdf': ['.pdf'],
  'reference-docs': ['.pdf', '.csv', '.json', '.txt', '.xlsx', '.xls'],
  'general': ['.csv', '.pdf', '.txt', '.json', '.xlsx', '.xls', ''] // Allow no extension for general
}

export async function POST(request: NextRequest) {
  console.log('[Upload] Starting upload request...')
  try {
    await ensureUploadDir()
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const category = formData.get('category') as string || 'general'
    
    console.log(`[Upload] File: ${file?.name}, Size: ${file?.size}, Category: ${category}`)
    
    if (!file) {
      console.log('[Upload] Error: No file provided')
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Check file size (limit to 100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      console.log(`[Upload] Error: File too large (${file.size} bytes)`)
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 })
    }
    
    // Check file extension
    const ext = path.extname(file.name).toLowerCase()
    const allowedExts = ALLOWED_TYPES[category] || ALLOWED_TYPES['general']
    if (!allowedExts.includes(ext)) {
      console.log(`[Upload] Error: Invalid extension ${ext}`)
      return NextResponse.json({ 
        error: `File type ${ext} not allowed for category ${category}. Allowed: ${allowedExts.join(', ')}` 
      }, { status: 400 })
    }
    
    // Create category subfolder
    const categoryDir = path.join(UPLOAD_DIR, category)
    if (!existsSync(categoryDir)) {
      await mkdir(categoryDir, { recursive: true })
    }
    
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${timestamp}_${sanitizedName}`
    const filePath = path.join(categoryDir, fileName)
    
    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        savedAs: fileName,
        size: file.size,
        type: file.type,
        category,
        uploadedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}

interface FileInfo {
  name: string
  originalName: string
  category: string
  size: number
  uploadedAt: string
  type: string
}

export async function GET() {
  try {
    await ensureUploadDir()
    
    const files: FileInfo[] = []
    
    // Read all category directories
    const categories = await readdir(UPLOAD_DIR)
    
    for (const category of categories) {
      const categoryPath = path.join(UPLOAD_DIR, category)
      const categoryStat = await stat(categoryPath)
      
      if (categoryStat.isDirectory()) {
        const categoryFiles = await readdir(categoryPath)
        
        for (const fileName of categoryFiles) {
          const filePath = path.join(categoryPath, fileName)
          const fileStat = await stat(filePath)
          
          if (fileStat.isFile()) {
            // Extract original name from timestamp prefix
            const originalName = fileName.substring(fileName.indexOf('_') + 1)
            const ext = path.extname(fileName).toLowerCase()
            
            let type = 'application/octet-stream'
            if (ext === '.csv') type = 'text/csv'
            else if (ext === '.pdf') type = 'application/pdf'
            else if (ext === '.txt') type = 'text/plain'
            else if (ext === '.json') type = 'application/json'
            else if (ext === '.xlsx' || ext === '.xls') type = 'application/vnd.ms-excel'
            
            files.push({
              name: fileName,
              originalName,
              category,
              size: fileStat.size,
              uploadedAt: fileStat.mtime.toISOString(),
              type
            })
          }
        }
      }
    }
    
    // Sort by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    
    return NextResponse.json({ files })
  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json({ files: [] })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const fileName = searchParams.get('file')
    
    if (!category || !fileName) {
      return NextResponse.json({ error: 'Missing category or file name' }, { status: 400 })
    }
    
    const filePath = path.join(UPLOAD_DIR, category, fileName)
    
    // Security check - ensure path is within UPLOAD_DIR
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }
    
    await unlink(filePath)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
