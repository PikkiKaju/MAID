using backend_aspdotnet.Models;

namespace backend_aspdotnet.Database
{
    public class PostgresDriver // Fake for now 
    {
        public static List<User> Users = new();

        public static User? ValidateUser(string username)
        {
            return Users.FirstOrDefault(u => u.Username == username);
        }

        public static bool RegisterUser(string username,string email, string password)
        {
            if (Users.Any(u => u.Username == username))
                return false;

            Users.Add(new User { Username = username,Email = email, Password = password });
            return true;
        }
    }
}
