-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT
);

-- CreateTable
CREATE TABLE "ManagerCoordinatorLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "managerId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ManagerCoordinatorLink_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ManagerCoordinatorLink_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "defaultColor" TEXT NOT NULL DEFAULT '#cccccc',
    "qtyPerSquad" INTEGER NOT NULL,
    "maxSquads" INTEGER NOT NULL DEFAULT 1,
    "multipleSquads" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "coordinatorId" TEXT NOT NULL,
    CONSTRAINT "Role_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Collaborator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "deliveryAddress" TEXT,
    "photoUrl" TEXT,
    "admissionDate" DATETIME NOT NULL,
    "birthDate" DATETIME,
    "resignationDate" DATETIME,
    "hasChildren" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp" TEXT,
    "contractType" TEXT NOT NULL DEFAULT 'CLT',
    "seniority" TEXT NOT NULL DEFAULT 'JUNIOR',
    "devType" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "roleId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    CONSTRAINT "Collaborator_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Collaborator_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "jiraLink" TEXT,
    "confluenceLink" TEXT,
    "sprintStart" DATETIME,
    "sprintDays" INTEGER DEFAULT 14,
    "coordinatorId" TEXT NOT NULL,
    CONSTRAINT "Squad_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SquadCollaborator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "squadId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    CONSTRAINT "SquadCollaborator_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SquadCollaborator_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntegrationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    CONSTRAINT "IntegrationEvent_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntegrationEventCollaborator" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    CONSTRAINT "IntegrationEventCollaborator_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "IntegrationEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IntegrationEventCollaborator_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeBankEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "expirationDate" DATETIME NOT NULL,
    "balanceHours" REAL NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    CONSTRAINT "TimeBankEntry_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "content" TEXT NOT NULL,
    "tag" TEXT,
    "type" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "origin" TEXT NOT NULL DEFAULT 'PERIODIC',
    "collaboratorId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Feedback_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "Collaborator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Feedback_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerCoordinatorLink_managerId_coordinatorId_key" ON "ManagerCoordinatorLink"("managerId", "coordinatorId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadCollaborator_squadId_collaboratorId_key" ON "SquadCollaborator"("squadId", "collaboratorId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationEventCollaborator_eventId_collaboratorId_key" ON "IntegrationEventCollaborator"("eventId", "collaboratorId");

-- CreateIndex
CREATE INDEX "TimeBankEntry_collaboratorId_idx" ON "TimeBankEntry"("collaboratorId");

-- CreateIndex
CREATE INDEX "TimeBankEntry_expirationDate_idx" ON "TimeBankEntry"("expirationDate");

-- CreateIndex
CREATE INDEX "Feedback_collaboratorId_idx" ON "Feedback"("collaboratorId");

-- CreateIndex
CREATE INDEX "Feedback_coordinatorId_idx" ON "Feedback"("coordinatorId");
