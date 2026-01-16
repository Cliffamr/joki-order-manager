'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const profileSchema = z.object({
  name: z.string().min(1, 'Nama harus diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter').optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.password && data.password !== data.confirmPassword) {
    return false
  }
  return true
}, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
})

export type ProfileState = {
  error?: string
  success?: boolean
  message?: string
}

export async function updateProfile(prevState: ProfileState, formData: FormData): Promise<ProfileState> {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return { error: 'Unauthorized', message: 'Anda harus login untuk melakukan ini' }
    }

    const rawData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword'),
    }

    const validatedFields = profileSchema.safeParse(rawData)

    if (!validatedFields.success) {
      return {
        error: 'Validation Error',
        message: validatedFields.error.errors[0].message,
      }
    }

    const { name, email, password } = validatedFields.data

    // Check if email is taken by another user
    const existingUser = await prisma.user.findFirst({
        where: {
            email: email,
            NOT: {
                id: session.user.id
            }
        }
    })

    if (existingUser) {
        return {
            error: 'Email Taken',
            message: 'Email sudah digunakan oleh pengguna lain'
        }
    }

    const updateData: any = {
      name,
      email,
    }

    if (password && password.length >= 6) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateData.password = hashedPassword
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    })

    revalidatePath('/profile')
    
    return { success: true, message: 'Profil berhasil diperbarui' }
  } catch (error) {
    console.error('Update profile error:', error)
    return { error: 'Server Error', message: 'Terjadi kesalahan saat memperbarui profil' }
  }
}
