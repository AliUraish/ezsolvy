-- Enable Row Level Security on all tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Helper function to get org_id from JWT claims
CREATE OR REPLACE FUNCTION auth.current_org_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid,
    NULL
  );
$$ LANGUAGE SQL STABLE;

-- Organizations policies
CREATE POLICY org_select ON organizations
  FOR SELECT USING (
    id = auth.current_org_id() OR
    owner_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = organizations.id AND user_id = auth.uid()
    )
  );

CREATE POLICY org_insert ON organizations
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid()
  );

CREATE POLICY org_update ON organizations
  FOR UPDATE USING (
    owner_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = organizations.id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Organization members policies
CREATE POLICY org_members_select ON organization_members
  FOR SELECT USING (
    org_id = auth.current_org_id() OR
    user_id = auth.uid()
  );

CREATE POLICY org_members_insert ON organization_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = org_id AND (owner_user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM organization_members WHERE org_id = organizations.id AND user_id = auth.uid() AND role IN ('owner', 'admin'))
      )
    )
  );

CREATE POLICY org_members_delete ON organization_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = org_id AND owner_user_id = auth.uid()
    )
  );

-- Documents policies
CREATE POLICY documents_select ON documents
  FOR SELECT USING (
    org_id = auth.current_org_id()
  );

CREATE POLICY documents_insert ON documents
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id() AND
    user_id = auth.uid()
  );

CREATE POLICY documents_update ON documents
  FOR UPDATE USING (
    org_id = auth.current_org_id() AND
    user_id = auth.uid()
  );

CREATE POLICY documents_delete ON documents
  FOR DELETE USING (
    org_id = auth.current_org_id() AND
    user_id = auth.uid()
  );

-- Canvases policies
CREATE POLICY canvases_select ON canvases
  FOR SELECT USING (
    org_id = auth.current_org_id()
  );

CREATE POLICY canvases_insert ON canvases
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id()
  );

CREATE POLICY canvases_update ON canvases
  FOR UPDATE USING (
    org_id = auth.current_org_id()
  );

-- Canvas assets policies
CREATE POLICY canvas_assets_select ON canvas_assets
  FOR SELECT USING (
    org_id = auth.current_org_id()
  );

CREATE POLICY canvas_assets_insert ON canvas_assets
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id()
  );

-- Questions policies
CREATE POLICY questions_select ON questions
  FOR SELECT USING (
    org_id = auth.current_org_id()
  );

CREATE POLICY questions_insert ON questions
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id()
  );

-- Transcripts policies
CREATE POLICY transcripts_select ON transcripts
  FOR SELECT USING (
    org_id = auth.current_org_id()
  );

CREATE POLICY transcripts_insert ON transcripts
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id()
  );

-- Jobs policies
CREATE POLICY jobs_select ON jobs
  FOR SELECT USING (
    org_id = auth.current_org_id()
  );

CREATE POLICY jobs_insert ON jobs
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id()
  );

CREATE POLICY jobs_update ON jobs
  FOR UPDATE USING (
    org_id = auth.current_org_id()
  );

-- Embeddings policies
CREATE POLICY embeddings_select ON embeddings
  FOR SELECT USING (
    org_id = auth.current_org_id()
  );

CREATE POLICY embeddings_insert ON embeddings
  FOR INSERT WITH CHECK (
    org_id = auth.current_org_id()
  );

-- Users table is not tenant-scoped but has basic protection
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON users
  FOR SELECT USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = users.id AND om2.user_id = auth.uid()
    )
  );

CREATE POLICY users_insert ON users
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );

CREATE POLICY users_update ON users
  FOR UPDATE USING (
    id = auth.uid()
  );

