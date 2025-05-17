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
                BaseAddress = new Uri("http://fastapi-app:8000"),
                Timeout = TimeSpan.FromSeconds(30)
            };
        }

        public async Task<string?> SendDataAsync(object data)
        {
            try
            {
                var json = JsonSerializer.Serialize(data);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync("/calculate", content);
                response.EnsureSuccessStatusCode();

                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error calling FastAPI: {ex.Message}");
                return null;
            }
        }
    }

}
