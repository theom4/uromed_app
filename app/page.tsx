     ```jsx
     <span>Informații Medicale</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleTranscribe('medical')}
                className={cn(
                  "flex items-center space-x-1",
                  activeTranscribe === 'medical' ? "bg-red-50 border-red-200 text-red-600" : "hover:bg-blue-50"
                )}
              >
                {activeTranscribe === 'medical' ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                <span className="text-xs">
                  {activeTranscribe === 'medical' ? 'Stop' : 'Transcrie'}
                </span>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="medical-info" className="text-sm font-medium text-slate-700">
                  Introduceți sau dictați informațiile medicale aici... Puteți scrie toate... structura textului conform standardelor medicale.
                </Label>
                <Textarea
                  id="medical-info"
                  placeholder="Introduceți informațiile medicale..."
                  value={medicalInfo}
                  onChange={(e) => setMedicalInfo(e.target.value)}
                  className="mt-2 min-h-[120px] resize-none"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Atașați fișiere medicale (imagini, documente)
                </Label>
                <div 
                  className={`mt-2 border-2 border-dashed rounded-lg p-4 transition-colors ${
                    dragStates.medical ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
                  }`}
                  onDragOver={(e) => handleDragOver(e, 'medical')}
                  onDragLeave={(e) => handleDragLeave(e, 'medical')}
                  onDrop={(e) => handleDrop(e, 'medical')}
                >
                  <Input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload(e.target.files, 'medical')}
                    className="hidden"
                    id="medical-files"
                  />
                  <Label htmlFor="medical-files" className={`cursor-pointer flex items-center justify-center space-x-2 h-20 ${
                    dragStates.medical ? 'text-blue-700' : 'text-slate-600 hover:text-blue-600'
                  }`}>
                    <Upload className="w-5 h-5" />
                    <span>{dragStates.medical ? 'Eliberează pentru a încărca' : 'Încărcați fișiere medicale sau trage aici'}</span>
                  </Label>
                </div>
                {medicalFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {medicalFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <div className="flex items-center space-x-2">
                          <Image className="w-4 h-4 text-slate-600" />
                          <span className="text-sm text-slate-700">{file.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Type Section */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b border-slate-200">
            <CardTitle className="flex items-center space-x-2 text-slate-800">
              <Settings className="w-5 h-5 text-green-600" />
              <span>Tipul Documentului</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selectați tipul documentului medical" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spitalizare-zi">Spitalizare de Zi</SelectItem>
                <SelectItem value="examen-clinic">Examen Clinic</SelectItem>
                <SelectItem value="recomandari-medicale">Recomandări Medicale</SelectItem>
                <SelectItem value="consultatie-urologica">Consultația Urologică</SelectItem>
                <SelectItem value="scrisoare-medicala">Scrisoare Medicală</SelectItem>
                <SelectItem value="interpretare-analiza">Interpretare Analiză</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Card className="shadow-lg border-slate-200">
          <CardContent className="p-6">
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !documentType || (!medicalInfo && medicalFiles.length === 0)}
              className={cn(
                "w-full h-12 text-white font-medium text-lg",
                "bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600",
                "shadow-lg hover:shadow-xl transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generează Document Medical...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Generează Document Medical</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Document General Section */}
        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2 text-slate-800">
                <FileText className="w-5 h-5 text-slate-600" />
                <span>Document General</span>
              </CardTitle>
              {generatedDocument && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyDocument}
                    className="flex items-center space-x-2"
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Copiat!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiază</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateDocument}
                    disabled={isUpdatingDocument}
                    className="flex items-center space-x-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    {isUpdatingDocument ? (
                      <>
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Se actualizează...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        <span>Actualizează Document</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
            {updateMessage && (
              <div className={`mt-2 text-sm px-3 py-2 rounded-md ${
                updateMessage.includes('succes') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {updateMessage}
              </div>
            )}
          </CardHeader>
          <CardContent className="p-6">
            {generatedDocument ? (
              <div className="space-y-4">
                <Textarea
                  value={generatedDocument}
                  onChange={(e) => setGeneratedDocument(e.target.value)}
                  className="min-h-[400px] max-h-[600px] resize-y text-sm font-mono leading-relaxed"
                  placeholder="Documentul generat va apărea aici și poate fi editat..."
                />
              </div>
            ) : (
              <p className="text-slate-600 text-sm">
                Documentul generat va fi disponibil după procesare. Vă rugăm să completați toate câmpurile necesare și să selectați tipul documentului dorit.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```