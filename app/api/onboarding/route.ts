import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../utils/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { companyName, businessType, role, phoneNumber, pincode, gstin, interestedMetals } = body;

    // Validate required fields
    const requiredFields = {
      companyName,
      businessType,
      role,
      phoneNumber,
      pincode,
      gstin
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Missing required fields',
          missingFields
        },
        { status: 400 }
      );
    }

    if (!interestedMetals || interestedMetals.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Please select at least one metal'
        },
        { status: 400 }
      );
    }

    // Validate GSTIN format (basic check)
    if (gstin.length !== 15) {
      return NextResponse.json(
        { 
          success: false,
          message: 'GSTIN must be 15 characters long'
        },
        { status: 400 }
      );
    }

    // Validate phone number
    if (phoneNumber.length < 10) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Phone number must be at least 10 digits'
        },
        { status: 400 }
      );
    }

    // Store or update data in the database
    const formEntry = await prisma.onboarding.upsert({
      where: { userId },
      update: {
        companyName,
        businessType,
        role,
        phoneNumber,
        pincode,
        gstin,
        interestedMetals,
      },
      create: {
        userId,
        companyName,
        businessType,
        role,
        phoneNumber,
        pincode,
        gstin,
        interestedMetals,
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: formEntry 
    });
    
  } catch (error) {
    console.error('Error saving form data:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}