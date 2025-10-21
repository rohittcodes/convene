import 'dotenv/config';
import { db } from '@/lib/db';
import { projects, projectMembers, tasks, notes } from '@/lib/db/schema/meetings';
import { 
  grantDocumentAccess, 
  grantProjectAccess, 
  grantTaskAccess, 
  grantNoteAccess 
} from './fga';

/**
 * Backfill FGA relations for existing database records
 * This script should be run once after setting up FGA to grant permissions
 * to existing data based on the current database state.
 */
async function backfillFGA() {
  console.log('Starting FGA relations backfill...');

  try {
    // 1. Grant owner permissions to all existing documents
    console.log('Processing documents...');
    const allDocuments = await db.query.documents.findMany();
    for (const doc of allDocuments) {
      await grantDocumentAccess(doc.userEmail, doc.id, 'owner');
      console.log(`Granted owner access to document ${doc.id} for user ${doc.userEmail}`);
    }
    console.log(`Processed ${allDocuments.length} documents`);

    // 2. Grant owner permissions to all existing projects
    console.log('Processing projects...');
    const allProjects = await db.query.projects.findMany();
    for (const project of allProjects) {
      // Get the owner's email from the project owner_user_id
      // Note: This assumes the owner_user_id is the same as the user's email
      // You may need to adjust this based on your user ID format
      await grantProjectAccess(project.owner_user_id, project.id, 'owner');
      console.log(`Granted owner access to project ${project.id} for user ${project.owner_user_id}`);
    }
    console.log(`Processed ${allProjects.length} projects`);

    // 3. Grant member permissions to project members
    console.log('Processing project members...');
    const allProjectMembers = await db.query.projectMembers.findMany();
    for (const member of allProjectMembers) {
      await grantProjectAccess(member.user_email, member.project_id, member.role as 'owner' | 'member' | 'viewer');
      console.log(`Granted ${member.role} access to project ${member.project_id} for user ${member.user_email}`);
    }
    console.log(`Processed ${allProjectMembers.length} project members`);

    // 4. Grant creator permissions to all existing tasks
    console.log('Processing tasks...');
    const allTasks = await db.query.tasks.findMany();
    for (const task of allTasks) {
      await grantTaskAccess(task.created_by, task.id, 'creator');
      console.log(`Granted creator access to task ${task.id} for user ${task.created_by}`);

      // Grant assignee permission if assigned_to is set
      if (task.assigned_to && task.assigned_to !== task.created_by) {
        await grantTaskAccess(task.assigned_to, task.id, 'assignee');
        console.log(`Granted assignee access to task ${task.id} for user ${task.assigned_to}`);
      }
    }
    console.log(`Processed ${allTasks.length} tasks`);

    // 5. Grant creator permissions to all existing notes
    console.log('Processing notes...');
    const allNotes = await db.query.notes.findMany();
    for (const note of allNotes) {
      await grantNoteAccess(note.created_by, note.id, 'creator');
      console.log(`Granted creator access to note ${note.id} for user ${note.created_by}`);
    }
    console.log(`Processed ${allNotes.length} notes`);

    console.log('✅ FGA relations backfill completed successfully!');
    console.log(`Summary:`);
    console.log(`- Documents: ${allDocuments.length}`);
    console.log(`- Projects: ${allProjects.length}`);
    console.log(`- Project Members: ${allProjectMembers.length}`);
    console.log(`- Tasks: ${allTasks.length}`);
    console.log(`- Notes: ${allNotes.length}`);

  } catch (error) {
    console.error('❌ FGA relations backfill failed:', error);
    process.exit(1);
  }
}

// Run the backfill if this script is executed directly
if (require.main === module) {
  backfillFGA()
    .then(() => {
      console.log('Backfill completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backfill failed:', error);
      process.exit(1);
    });
}

export { backfillFGA };
