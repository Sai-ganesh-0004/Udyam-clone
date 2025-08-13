import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  // Header bar JSX
  const headerBar = (
    <div
      style={{
        width: "100vw",
        background: "#463cc2",
        color: "white",
        padding: 0,
        margin: 0,
        fontFamily: "inherit",
        fontWeight: 400,
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 0 0 24px",
          height: 60,
        }}
      >
        <img
          src="https://udyamregistration.gov.in/images/emblem.png"
          alt="India Emblem"
          style={{ height: 40, marginRight: 16 }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 500, letterSpacing: 1 }}>
            सूक्ष्म, लघु और मध्यम उद्यम मंत्रालय
          </span>
          <span style={{ fontSize: 16, fontWeight: 400 }}>
            Ministry of Micro, Small & Medium Enterprises
          </span>
        </div>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            fontSize: 17,
            fontWeight: 400,
            height: "100%",
            marginRight: 32,
          }}
        >
          <a
            href="#"
            style={{
              color: "white",
              textDecoration: "none",
              borderBottom: "2px solid white",
              padding: "0 4px",
              fontWeight: 600,
            }}
          >
            Home
          </a>
          <a
            href="#"
            style={{ color: "white", textDecoration: "none", padding: "0 4px" }}
          >
            NIC Code
          </a>
          <span style={{ color: "white", cursor: "pointer", padding: "0 4px" }}>
            Useful Documents ▼
          </span>
          <span style={{ color: "white", cursor: "pointer", padding: "0 4px" }}>
            Print / Verify ▼
          </span>
          <span style={{ color: "white", cursor: "pointer", padding: "0 4px" }}>
            Update Details ▼
          </span>
          <span style={{ color: "white", cursor: "pointer", padding: "0 4px" }}>
            Login ▼
          </span>
        </nav>
      </div>
      <div
        style={{
          background: "#f4f6f9",
          color: "#23235b",
          textAlign: "center",
          fontSize: 32,
          fontWeight: 500,
          letterSpacing: 1,
          padding: "18px 0 12px 0",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        UDYAM REGISTRATION FORM - For New Enterprise who are not Registered yet
        as MSME
      </div>
    </div>
  );
  const [schema, setSchema] = useState({ fields: [] });
  const [formData, setFormData] = useState({});
  const [step, setStep] = useState(1);
  const [otpMessage, setOtpMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch("/form_schema.json")
      .then((res) => res.json())
      .then((data) => {
        setSchema(data);

        const initialData = {};
        (data.fields || []).forEach((f) => {
          initialData[f.name] = f.type === "checkbox" ? false : "";
        });

        initialData["aadhaar"] = "";
        initialData["name"] = "";
        initialData["consent"] = false;
        initialData["otp"] = "";
        initialData["pan"] = "";

        setFormData(initialData);
      })
      .catch((err) => console.error("Error loading schema:", err));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newName = name;
    if (name.includes("txtadharno")) newName = "aadhaar";
    if (name.includes("txtownername")) newName = "name";
    if (name.includes("chkDecarationA")) newName = "consent";
    setFormData({
      ...formData,
      [newName]: type === "checkbox" ? checked : value,
    });
  };

  const handleGenerateOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setOtpMessage("");
    try {
      const res = await fetch("http://localhost:4000/api/generate-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaar: formData.aadhaar,
          name: formData.name,
          consent: formData.consent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpMessage(`OTP: ${data.otp}`);
        setStep(2);
      } else {
        setErrorMessage(data.error || "Failed to generate OTP");
      }
    } catch (err) {
      setErrorMessage("Error generating OTP");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    try {
      const res = await fetch("http://localhost:4000/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaar: formData.aadhaar,
          otp: formData.otp,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(3);
      } else {
        setErrorMessage(data.error || "Invalid OTP");
        alert("OTP Invalid");
      }
    } catch (err) {
      setErrorMessage("Error verifying OTP");
    }
  };

  const handleSubmitPan = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    try {
      const res = await fetch("http://localhost:4000/api/submit-pan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aadhaar: formData.aadhaar,
          orgType: formData.orgType,
          pan: formData.pan,
          panName: formData.panName,
          panDob: formData.panDob,
          panConsent: formData.panConsent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("PAN submitted successfully!");
        setStep(1);
      } else {
        setErrorMessage(data.error || "Failed to submit PAN");
      }
    } catch (err) {
      setErrorMessage("Error submitting PAN");
    }
  };

  return (
    <>
      {headerBar}
      <div className="main-wrapper">
        <div className="form-box">
          <div className="form-header">Aadhaar Verification With OTP</div>
          {step === 1 && (
            <form onSubmit={handleGenerateOtp}>
              <div className="form-row">
                <div className="form-group">
                  <label>1. Aadhaar Number / आधार संख्या</label>
                  <input
                    type="text"
                    name="ctl00$ContentPlaceHolder1$txtadharno"
                    value={formData.aadhaar}
                    onChange={handleChange}
                    onInput={(e) =>
                      (e.target.value = e.target.value.replace(/[^0-9]/g, ""))
                    }
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Your Aadhaar No"
                    maxLength="12"
                  />
                </div>
                <div className="form-group">
                  <label>2. Name of Entrepreneur / उद्यमी का नाम</label>
                  <input
                    type="text"
                    name="ctl00$ContentPlaceHolder1$txtownername"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Name as per Aadhaar"
                    maxLength="100"
                  />
                </div>
              </div>
              <ul className="info-list">
                <li>
                  Aadhaar number shall be required for Udyam Registration.
                </li>
                <li>
                  The Aadhaar number shall be of the proprietor in the case of a
                  proprietorship firm, of the managing partner in the case of a
                  partnership firm and of a karta in the case of a Hindu
                  Undivided Family (HUF).
                </li>
                <li>
                  In case of a Company or a Limited Liability Partnership or a
                  Cooperative Society or a Society or a Trust, the organisation
                  or its authorised signatory shall provide its GSTIN (As per
                  applicability of CGST Act 2017 and as notified by the ministry
                  of MSME{" "}
                  <a
                    href="https://msme.gov.in/notification/S.O.1055(E)-dated-05-03-2021"
                    target="_blank"
                    rel="noreferrer"
                  >
                    vide S.O. 1055(E) dated 05th March 2021
                  </a>
                  ) and PAN along with its Aadhaar number.
                </li>
              </ul>
              <div className="checkbox-row">
                <input
                  type="checkbox"
                  name="ctl00$ContentPlaceHolder1$chkDecarationA"
                  checked={formData.consent || false}
                  onChange={handleChange}
                />
                <label>
                  I, the holder of the above Aadhaar, hereby give my consent to
                  Ministry of MSME, Government of India, for using my Aadhaar
                  number as allotted by UIDAI for Udyam Registration. NIC /
                  Ministry of MSME, Government of India, have informed me that
                  my aadhaar data will not be stored/shared. / मैं, आधार धारक,
                  इस प्रकार उद्यम पंजीकरण के लिए यूआईडीआईआई के साथ अपने आधार
                  संख्या का उपयोग करने के लिए सूचित मंत्रालय, भारत सरकार को अपनी
                  सहमति देता हूं। एनआईसी / सूo नंo 1055
                </label>
              </div>
              <button type="submit" className="primary-btn">
                Validate & Generate OTP
              </button>
              {otpMessage && <p className="info">{otpMessage}</p>}
              {errorMessage && <p className="error">{errorMessage}</p>}
            </form>
          )}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label>2. Enter OTP</label>
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  placeholder="Enter OTP"
                />
              </div>
              <button type="submit" className="primary-btn">
                Verify OTP
              </button>
              {errorMessage && <p className="error">{errorMessage}</p>}
            </form>
          )}
          {step === 3 && (
            <form onSubmit={handleSubmitPan}>
              <div
                className="form-header"
                style={{
                  background: "#28a745",
                  color: "white",
                  fontSize: "22px",
                  marginBottom: 0,
                }}
              >
                PAN Verification
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontWeight: "bold" }}>
                    3. Type of Organisation / संगठन के प्रकार
                  </label>
                  <select
                    name="orgType"
                    value={formData.orgType || ""}
                    onChange={handleChange}
                    style={{ height: "40px", fontSize: "16px" }}
                    required
                  >
                    <option value="">
                      Type of Organisation / संगठन के प्रकार
                    </option>
                    <option value="proprietorship">Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="company">Company</option>
                    <option value="llp">LLP</option>
                    <option value="society">Society</option>
                    <option value="trust">Trust</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontWeight: "bold" }}>4.1 PAN/पैन</label>
                  <input
                    type="text"
                    name="pan"
                    value={formData.pan || ""}
                    onChange={handleChange}
                    placeholder="ENTER PAN NUMBER"
                    style={{ height: "40px", fontSize: "16px" }}
                    maxLength={10}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontWeight: "bold" }}>
                    4.1.1 Name of PAN Holder / पैन धारक का नाम
                  </label>
                  <input
                    type="text"
                    name="panName"
                    value={formData.panName || ""}
                    onChange={handleChange}
                    placeholder="Name as per PAN"
                    style={{ height: "40px", fontSize: "16px" }}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ fontWeight: "bold" }}>
                    4.1.2 DOB or DOI as per PAN / पैन के अनुसार जन्म तिथि या
                    निगमन तिथि
                  </label>
                  <input
                    type="text"
                    name="panDob"
                    value={formData.panDob || ""}
                    onChange={handleChange}
                    placeholder="DD/MM/YYYY"
                    style={{ height: "40px", fontSize: "16px" }}
                    required
                  />
                </div>
              </div>
              <div style={{ margin: "16px 0 8px 0" }}>
                <input
                  type="checkbox"
                  name="panConsent"
                  checked={formData.panConsent || false}
                  onChange={handleChange}
                  style={{ marginRight: "8px" }}
                  required
                />
                <span>
                  I, the holder of the above PAN, hereby give my consent to
                  Ministry of MSME, Government of India, for using my data/
                  information available in the Income Tax Returns filed by me,
                  and also the same available in the GST Returns and also from
                  other Government organizations, for MSME classification and
                  other official purposes, in pursuance of the MSMED Act, 2006.
                </span>
              </div>
              <button
                type="submit"
                className="primary-btn"
                style={{
                  background: "#007bff",
                  color: "white",
                  fontWeight: "bold",
                  width: "140px",
                  height: "44px",
                  fontSize: "18px",
                }}
              >
                PAN Validate
              </button>
              {errorMessage && <p className="error">{errorMessage}</p>}
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
