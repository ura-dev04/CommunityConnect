# CommunityConnect Management App

CommunityConnect is a comprehensive society management application designed to streamline communication and management tasks for residential societies, apartment complexes, and gated communities.

## Features

### User Management
- **Multi-role Authentication**: Supports different user roles (managing committee and Resident)
- **User Profiles**: Complete user profiles with personal information and apartment details
- **Password Recovery**: Secure password reset functionality

### Communication
- **Notice Board**: Digital notice board for society-wide announcements
- **Discussion Forum**: Community discussion platform with topic categorization
- **Complaint Management**: System for residents to register and track complaints

### Security Features
- **Visitor Management**: Digital log and approval system for visitors
- **Vehicle Registration**: Register and manage guest vehicles

### Billing & Payments
- **Maintenance Fee Collection**: Track and manage society maintenance payments
- **Payment History**: View complete payment records for residents
- **Invoice Generation**: Generate and distribute invoices for dues

### Amenities Management
- **Amenity Booking System**: Book common areas like party halls, gyms, etc.
- **Maintenance Scheduling**: Schedule maintenance for community facilities
- **Service Provider Directory**: List of approved service providers

### Events & Activities
- **Community Calendar**: Calendar for society events and activities
- **Event Registration**: RSVP system for community events
- **Polls & Surveys**: Conduct polls for community decisions

### Mobile Responsiveness
- **Cross-platform Access**: Access the system via web and mobile interfaces

## Technical Implementation

- **Frontend**: HTML, CSS, and JavaScript for a responsive user interface
- **Database**: Firebase Realtime Database for data storage and synchronization
- **Storage**: Firebase Storage for document and media uploads
- **Authentication**: Firebase Authentication for secure user management
- **Hosting**: Firebase Hosting for web application deployment
- **Real-time Updates**: Firebase Realtime Database features for instant notifications and updates


## Setup Instructions

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   - Rename `.env.example` to `.env`
   - Update the values in the `.env` file with your Firebase configuration

3. Start the server:
   ```
   npm start
   ```

4. Access the application:
   - Open your browser and navigate to `http://localhost:3000`

## Environment Variables

The following environment variables are required in the `.env` file:

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_DATABASE_URL=your_database_url
PORT=3000
```