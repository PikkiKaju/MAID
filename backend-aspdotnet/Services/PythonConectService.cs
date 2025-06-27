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

        public PythonConectService()
        {
            _httpClient = new HttpClient
            {
                BaseAddress = new Uri("http://django:8000"),
                Timeout = TimeSpan.FromSeconds(30)
            };
        }

        public async Task<string?> SendDataAsync(object data, string algorithm)
        {
            try
            {
                var json = JsonSerializer.Serialize(data);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                Console.WriteLine(content.ReadAsStringAsync().Result); // Log the content for debugging
                // Build endpoint based on algorithm, e.g., /linear/, /ridge/, etc.
                string endpoint = $"/{algorithm.ToLowerInvariant().Replace(" ", "-")}/";

                var response = await _httpClient.PostAsJsonAsync("api"+endpoint, content);
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
