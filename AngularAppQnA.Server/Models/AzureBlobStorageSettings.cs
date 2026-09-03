namespace AngularAppQnA.Server.Models
{
    public class AzureBlobStorageSettings
    {
        public string ConnectionString { get; set; } = string.Empty;

        public string ContainerName { get; set; } = string.Empty;
    }
}