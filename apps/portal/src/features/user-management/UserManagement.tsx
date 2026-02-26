import { Box, Container } from "@mui/material";
import { UserList } from "./components/UserList";

/**
 * ユーザー管理メインページ
 * Cognitoユーザーの管理機能を提供
 */
const UserManagement = () => {
  return (
    <Container maxWidth={false}>
      <Box>
        <UserList />
      </Box>
    </Container>
  );
};

export default UserManagement;
