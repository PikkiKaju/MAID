using Org.BouncyCastle.Asn1;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace backend_aspdotnet.Services
{
    public class PythonConectService
    {
        private readonly HttpClient _httpClient;
        private static readonly string DJANGO_BASE_URL = Environment.GetEnvironmentVariable("DJANGO_BASE_URL");

        public PythonConectService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            // Ensure base address and sensible timeout are set even when HttpClient is provided by DI
            if (_httpClient.BaseAddress == null)
            {
                _httpClient.BaseAddress = new Uri(DJANGO_BASE_URL);
            }
            _httpClient.Timeout = TimeSpan.FromSeconds(30);
        }

        public async Task<string?> SendDataAsync(object data, string algorithm)
        {
            try
            {
                var json = JsonSerializer.Serialize(data);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                Console.WriteLine(await content.ReadAsStringAsync()); // Log the content for debugging
                // Build endpoint based on algorithm, e.g., /linear/, /ridge/, etc.
                string endpoint = $"/{algorithm.ToLowerInvariant().Replace(" ", "-")}/";

                var response = await _httpClient.PostAsync("api" + endpoint, content);
                response.EnsureSuccessStatusCode();

                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error calling Django at /{algorithm}/: {ex.Message}");
                return null;
            }
        }
    }

}
