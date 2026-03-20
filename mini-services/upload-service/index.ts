/**
 * Large File Upload Service
 * Runs on port 3004 to handle file uploads > 4MB
 * Bypasses Next.js body size limits
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'

const PORT = 3004
const UPLOAD_DIR = join(process.cwd(), 'user-uploads')

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true })
}

// Allowed file types
const ALLOWED_TYPES: Record<string, string[]> = {
  'nutrition-csv': ['.csv', '.xlsx', '.xls'],
  'toxins-pdf': ['.pdf'],
  'recipes-pdf': ['.pdf'],
  'reference-docs': ['.pdf', '.csv', '.json', '.txt', '.xlsx', '.xls'],
  'general': ['.csv', '.pdf', '.txt', '.json', '.xlsx', '.xls', ''] // Allow files without extension
}

console.log(`[Upload Service] Starting on port ${PORT}...`)

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }

    // GET - List uploaded files
    if (req.method === 'GET' && url.pathname === '/list') {
      try {
        const files: Array<{
          name: string
          originalName: string
          category: string
          size: number
          uploadedAt: string
          type: string
        }> = []

        const categories = readdirSync(UPLOAD_DIR)
        
        for (const category of categories) {
          const categoryPath = join(UPLOAD_DIR, category)
          const categoryStat = statSync(categoryPath)
          
          if (categoryStat.isDirectory()) {
            const categoryFiles = readdirSync(categoryPath)
            
            for (const fileName of categoryFiles) {
              const filePath = join(categoryPath, fileName)
              const fileStat = statSync(filePath)
              
              if (fileStat.isFile()) {
                const originalName = fileName.substring(fileName.indexOf('_') + 1)
                const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
                
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

        files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

        return Response.json({ files })
      } catch (error) {
        console.error('[Upload Service] List error:', error)
        return Response.json({ files: [] })
      }
    }

    // POST - Upload file
    if (req.method === 'POST' && url.pathname === '/file-upload') {
      console.log('[Upload Service] Starting upload...')
      
      try {
        const formData = await req.formData()
        const file = formData.get('file') as File | null
        const category = formData.get('category') as string || 'general'

        console.log(`[Upload Service] File: ${file?.name}, Size: ${file?.size} bytes, Category: ${category}`)

        if (!file) {
          return Response.json({ error: 'No file provided' }, { status: 400 })
        }

        // Check file size (100MB limit)
        const maxSize = 100 * 1024 * 1024
        if (file.size > maxSize) {
          return Response.json({ error: 'File too large (max 100MB)' }, { status: 400 })
        }

        // Check file extension
        const fileName = file.name
        const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : ''
        const allowedExts = ALLOWED_TYPES[category] || ALLOWED_TYPES['general']
        
        if (!allowedExts.includes(ext)) {
          return Response.json({ 
            error: `File type ${ext || '(no extension)'} not allowed for category ${category}` 
          }, { status: 400 })
        }

        // Create category directory
        const categoryDir = join(UPLOAD_DIR, category)
        if (!existsSync(categoryDir)) {
          mkdirSync(categoryDir, { recursive: true })
        }

        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
        const savedFileName = `${timestamp}_${sanitizedName}`
        const filePath = join(categoryDir, savedFileName)

        // Write file
        const arrayBuffer = await file.arrayBuffer()
        writeFileSync(filePath, Buffer.from(arrayBuffer))

        console.log(`[Upload Service] Successfully saved: ${savedFileName}`)

        return Response.json({
          success: true,
          file: {
            name: fileName,
            savedAs: savedFileName,
            size: file.size,
            type: file.type,
            category,
            uploadedAt: new Date().toISOString()
          }
        })
      } catch (error) {
        console.error('[Upload Service] Upload error:', error)
        return Response.json({ 
          error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 })
      }
    }

    // DELETE - Delete file
    if (req.method === 'DELETE' && url.pathname === '/delete') {
      try {
        const category = url.searchParams.get('category')
        const fileName = url.searchParams.get('file')

        if (!category || !fileName) {
          return Response.json({ error: 'Missing category or file name' }, { status: 400 })
        }

        const filePath = join(UPLOAD_DIR, category, fileName)
        
        // Security check
        if (!filePath.startsWith(UPLOAD_DIR)) {
          return Response.json({ error: 'Invalid file path' }, { status: 400 })
        }

        if (existsSync(filePath)) {
          unlinkSync(filePath)
        }

        return Response.json({ success: true })
      } catch (error) {
        console.error('[Upload Service] Delete error:', error)
        return Response.json({ error: 'Failed to delete file' }, { status: 500 })
      }
    }

    // Health check
    if (req.method === 'GET' && url.pathname === '/health') {
      return Response.json({ status: 'ok', service: 'upload-service', port: PORT })
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  }
})

console.log(`[Upload Service] Ready on port ${PORT}`)
