import mongoose from "mongoose";
import user from "../models/auth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { normalizePhone } from "../services/passwordReset.js";
export const Signup = async (req, res) => {
  const { name, email, password, phone } = req.body;
  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);
    const exisitinguser = await user.findOne({ email: normalizedEmail });
    if (exisitinguser) {
      return res.status(404).json({ message: "User already exist" });
    }
    const hashpassword = await bcrypt.hash(password, 12);
    const newuser = await user.create({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashpassword,
    });
    const token = jwt.sign(
      { email: newuser.email, id: newuser._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const safeUser = newuser.toObject();
    delete safeUser.password;
    delete safeUser.forgotPasswordLastRequestedAt;
    res.status(200).json({ data: safeUser, token });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};
export const Login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const exisitinguser = await user.findOne({ email: normalizedEmail });
    if (!exisitinguser) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const ispasswordcrct = await bcrypt.compare(
      password,
      exisitinguser.password
    );
    if (!ispasswordcrct) {
      return res.status(400).json({ message: "Invalid password" });
    }
    const token = jwt.sign(
      { email: exisitinguser.email, id: exisitinguser._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const safeUser = exisitinguser.toObject();
    delete safeUser.password;
    delete safeUser.forgotPasswordLastRequestedAt;
    res.status(200).json({ data: safeUser, token });
  } catch (error) {
     res.status(500).json("something went wrong..");
   return;
  }
};
export const getallusers = async (req, res) => {
  try {
    const alluser = await user.find().select("-password -phone -forgotPasswordLastRequestedAt");
    res.status(200).json({ data: alluser });
  } catch (error) {
    res.status(500).json("something went wrong..");
    return;
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { name, about, tags } = req.body.editForm;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "User unavailable" });
  }
  try {
    if (String(req.userid) !== String(_id)) {
      return res.status(403).json({ message: "You can only update your own profile" });
    }
    const updateprofile = await user.findByIdAndUpdate(
      _id,
      { $set: { name: name, about: about, tags: tags } },
      { new: true }
    );
    res.status(200).json({ data: updateprofile });
  } catch (error) {
    console.log(error);
    res.status(500).json("something went wrong..");
    return;
  }
};
