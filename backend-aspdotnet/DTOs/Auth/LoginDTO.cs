namespace backend_aspdotnet.DTOs
{
    /// <summary>
    /// DTO for login credentials.
    /// </summary>
    public class LoginDto
    {
        /// <summary>
        /// Username for login.
        /// </summary>
        public required string Username { get; set; }

        /// <summary>
        /// Password for login.
        /// </summary>
        public required string Password { get; set; }

    }
}
