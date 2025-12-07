# Implementation Tasks: Add Store Management

## 1. Database Schema Changes

- [ ] 1.1 Create stores table
  - Create `stores` table with fields: id, name, address, phone, contact_person, status, created_at, updated_at
  - Add indexes for name and status fields
  - Add trigger for updated_at timestamp
  - _Requirements: Store Entity Management_

- [ ] 1.2 Add store_id to profiles table
  - Add `store_id UUID REFERENCES stores(id)` column to profiles table
  - Create index on store_id field
  - Allow NULL initially for backward compatibility
  - _Requirements: Store-Resource Association_

- [ ] 1.3 Add store_id to resources table
  - Add `store_id UUID REFERENCES stores(id)` column to resources table
  - Create index on store_id field
  - Allow NULL initially for backward compatibility
  - _Requirements: Store-Resource Association_

- [ ] 1.4 Add store_id to appointments table
  - Add `store_id UUID REFERENCES stores(id)` column to appointments table
  - Create index on store_id field
  - Allow NULL initially for backward compatibility
  - _Requirements: Store-Based Appointment Flow_

- [ ] 1.5 Add store_id to dingtalk_departments table
  - Add `store_id UUID REFERENCES stores(id)` column to dingtalk_departments table
  - This enables mapping DingTalk departments to stores
  - _Requirements: DingTalk Department Store Mapping_

- [ ] 1.6 Create data migration script
  - Create migration script to add default store
  - Migrate existing users, resources, and appointments to default store
  - Verify all records have store_id after migration
  - _Requirements: Data Migration for Existing Records_

## 2. Backend API Implementation

- [ ] 2.1 Implement store CRUD APIs
  - `GET /api/stores` - List stores with filters (status, search)
  - `POST /api/stores` - Create new store
  - `PUT /api/stores/:id` - Update store information
  - `DELETE /api/stores/:id` - Delete store (with validation)
  - `GET /api/stores/:id` - Get store details
  - _Requirements: Store Entity Management_

- [ ] 2.2 Implement store resource query API
  - `GET /api/stores/:id/resources` - Get all resources for a store
  - Return nurses, doctors, and rooms grouped by type
  - _Requirements: Store-Resource Association_

- [ ] 2.3 Add store filtering to existing APIs
  - Modify `GET /api/appointments` to filter by store_id
  - Modify `GET /api/schedules` to filter by store_id
  - Modify `GET /api/resources` to filter by store_id
  - Modify `GET /api/profiles` to filter by store_id (for nurses/doctors)
  - _Requirements: Store-Based Schedule Management_

- [ ] 2.4 Implement store-based permission middleware
  - Create middleware to check user's store_id
  - Restrict head_nurse and nurse to their own store data
  - Allow sales and super_admin to access all stores
  - Return 403 for unauthorized cross-store access
  - _Requirements: Store-Based Permission Control_

- [ ] 2.5 Update appointment creation API
  - Require `store_id` parameter in appointment creation
  - Validate that selected resources belong to the same store
  - Return error if cross-store resources are selected
  - _Requirements: Store-Based Appointment Flow_

- [ ] 2.6 Update user and resource management APIs
  - Add `store_id` parameter to user creation/update
  - Add `store_id` parameter to resource creation/update
  - Support transferring users/resources between stores
  - _Requirements: Store-Resource Association_

- [ ] 2.7 Update DingTalk sync logic
  - Modify sync to check department-store mappings
  - Auto-assign store_id when syncing users
  - Handle users in multiple departments
  - Log users without store mapping
  - _Requirements: DingTalk Department Store Mapping_

## 3. Type Definitions

- [ ] 3.1 Add store types to types.ts
  - Define `Store` interface
  - Define `StoreStatus` type ('active' | 'inactive')
  - Define `CreateStoreInput` interface
  - Define `UpdateStoreInput` interface
  - Add `store_id` to Profile, Resource, Appointment interfaces
  - _Requirements: Store Entity Management_

- [ ] 3.2 Add store-related API response types
  - Define `StoreWithResources` interface
  - Define `StoreResourcesSummary` interface
  - Update existing types to include store information
  - _Requirements: Store-Resource Association_

## 4. Frontend - Store Management Page

- [ ] 4.1 Create StoreManagementPage component
  - Create page at `src/pages/admin/StoreManagementPage.tsx`
  - Display stores in a table with name, address, phone, status
  - Add search and filter functionality
  - Show resource counts for each store
  - _Requirements: Store Entity Management_

- [ ] 4.2 Create StoreFormDialog component
  - Create dialog for creating/editing stores
  - Form fields: name, address, phone, contact_person, status
  - Validation for required fields
  - Handle create and update operations
  - _Requirements: Store Entity Management_

- [ ] 4.3 Implement store deletion with validation
  - Add delete button with confirmation dialog
  - Check for associated resources before deletion
  - Show error message if store has dependencies
  - Allow deletion only for empty stores
  - _Requirements: Store Entity Management_

- [ ] 4.4 Add store management to admin navigation
  - Add "门店管理" menu item in admin section
  - Update routes to include store management page
  - Restrict access to super_admin role
  - _Requirements: Store Entity Management_

## 5. Frontend - Appointment Flow Updates

- [ ] 5.1 Add store selection to appointment creation
  - Create StoreSelector component
  - Show as first step in appointment creation flow
  - Display only active stores
  - Store selected store_id in form state
  - _Requirements: Store-Based Appointment Flow_

- [ ] 5.2 Filter services by selected store
  - Modify service selection to accept store_id parameter
  - Query only services available for selected store
  - Update service list when store changes
  - _Requirements: Store-Based Appointment Flow_

- [ ] 5.3 Filter doctors by selected store
  - Modify doctor selection to filter by store_id
  - Show only doctors assigned to selected store
  - Update doctor list when store changes
  - _Requirements: Store-Based Appointment Flow_

- [ ] 5.4 Update appointment form submission
  - Include store_id in appointment creation payload
  - Validate store_id is present before submission
  - Handle errors for cross-store resource conflicts
  - _Requirements: Store-Based Appointment Flow_

## 6. Frontend - Schedule Page Updates

- [ ] 6.1 Add store filter to schedule page
  - Add store selector to SchedulePage header
  - For head_nurse: auto-select and lock to their store
  - For super_admin: allow selecting any store
  - Filter appointments and schedules by selected store
  - _Requirements: Store-Based Schedule Management_

- [ ] 6.2 Filter resources by store in schedule creation
  - Modify nurse selector to filter by appointment's store_id
  - Modify room selector to filter by appointment's store_id
  - Prevent selection of resources from other stores
  - _Requirements: Store-Based Schedule Management_

- [ ] 6.3 Update schedule list to show store information
  - Add store name column to schedule table
  - Show store badge on appointment cards
  - Update filters to include store
  - _Requirements: Store-Based Schedule Management_

## 7. Frontend - User Management Updates

- [ ] 7.1 Add store field to user management
  - Add store_id column to user table
  - Add store selector in user creation/edit form
  - Show store name in user list
  - Allow filtering users by store
  - _Requirements: Store-Resource Association_

- [ ] 7.2 Add store transfer functionality
  - Add "Transfer Store" action for users
  - Show confirmation dialog with impact warning
  - Update user's store_id via API
  - Refresh user list after transfer
  - _Requirements: Store-Resource Association_

## 8. Frontend - Task Page Updates

- [ ] 8.1 Filter nurse tasks by store
  - Automatically filter tasks by nurse's store_id
  - Show store information on task cards
  - Ensure nurses only see their store's tasks
  - _Requirements: Store-Based Schedule Management_

## 9. Frontend - DingTalk Integration Updates

- [ ] 9.1 Add store mapping to DingTalk config
  - Add department-store mapping section in DingTalkConfigDialog
  - Allow admin to map DingTalk departments to stores
  - Show current mappings in a table
  - Save mappings to dingtalk_departments table
  - _Requirements: DingTalk Department Store Mapping_

- [ ] 9.2 Update sync logs to show store assignments
  - Show which store each synced user was assigned to
  - Highlight users without store assignment
  - Provide link to manually assign stores
  - _Requirements: DingTalk Department Store Mapping_

## 10. API Client Updates

- [ ] 10.1 Add store API methods to api-client.ts
  - `getStores(filters)` - Get store list
  - `getStore(id)` - Get store details
  - `createStore(data)` - Create store
  - `updateStore(id, data)` - Update store
  - `deleteStore(id)` - Delete store
  - `getStoreResources(id)` - Get store resources
  - _Requirements: Store Entity Management_

- [ ] 10.2 Update existing API methods with store filtering
  - Add optional `store_id` parameter to resource queries
  - Add optional `store_id` parameter to appointment queries
  - Add optional `store_id` parameter to schedule queries
  - Update method signatures and documentation
  - _Requirements: Store-Based Schedule Management_

## 11. Testing and Validation

- [ ] 11.1 Test store CRUD operations
  - Test creating stores with valid data
  - Test updating store information
  - Test deleting empty stores
  - Test preventing deletion of stores with dependencies
  - _Requirements: Store Entity Management_

- [ ] 11.2 Test store-based permissions
  - Test head_nurse can only access own store
  - Test nurse can only see own store tasks
  - Test sales can create appointments for any store
  - Test admin can access all stores
  - _Requirements: Store-Based Permission Control_

- [ ] 11.3 Test appointment flow with stores
  - Test store selection in appointment creation
  - Test service filtering by store
  - Test doctor filtering by store
  - Test cross-store resource validation
  - _Requirements: Store-Based Appointment Flow_

- [ ] 11.4 Test data migration
  - Run migration script on test database
  - Verify default store is created
  - Verify all existing records are migrated
  - Verify no NULL store_id values remain
  - _Requirements: Data Migration for Existing Records_

- [ ] 11.5 Test DingTalk integration with stores
  - Test department-store mapping
  - Test user sync with store assignment
  - Test handling users in multiple departments
  - Test users without store mapping
  - _Requirements: DingTalk Department Store Mapping_

## 12. Documentation

- [ ] 12.1 Update API documentation
  - Document new store management endpoints
  - Document store_id parameters in existing endpoints
  - Document permission rules for store access
  - Provide examples for common operations
  - _Requirements: Store Entity Management_

- [ ] 12.2 Create user guide for store management
  - Document how to create and manage stores
  - Document how to assign users and resources to stores
  - Document appointment flow with store selection
  - Document DingTalk department mapping
  - _Requirements: Store Entity Management_

- [ ] 12.3 Create migration guide
  - Document migration process and steps
  - Document rollback procedures
  - Document data verification steps
  - Provide troubleshooting tips
  - _Requirements: Data Migration for Existing Records_
